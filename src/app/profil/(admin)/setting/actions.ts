"use server";

import { revalidatePath } from "next/cache";
import {
  validationErrorMessage,
  type ActionResult,
} from "@/lib/action-result";
import { requireFeature } from "@/lib/auth";
import { checkedMutation } from "@/lib/database/mutation";
import {
  parseSiteSectionFormData,
  SITE_HERO_IMAGE_FIELD,
  SITE_IMAGE_FIELDS,
  toSiteSectionUpdate,
  type SiteSettingsSection,
} from "@/lib/site-config";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  removeManagedImagesIfUnused,
  uploadManagedImage,
  type ManagedImageAsset,
} from "@/lib/assets/managed-images";
import { UPLOAD_LIMITS } from "@/lib/constants";
import { readPhotoDimensions } from "@/lib/media-editor/image";
import { normalizeMediaDimensions } from "@/lib/media/display";

/** Gambar milik tiap tab; upload & GC hanya menyentuh field section aktif. */
const SECTION_IMAGE_FIELDS: Record<
  SiteSettingsSection,
  typeof SITE_IMAGE_FIELDS[number][]
> = {
  identity: SITE_IMAGE_FIELDS.filter(
    (field) => field.kind === "site-logo" || field.kind === "site-favicon",
  ),
  home: [SITE_HERO_IMAGE_FIELD],
  seo: SITE_IMAGE_FIELDS.filter((field) => field.kind === "site-seo"),
  contact: [],
};

const SITE_SETTINGS_IMAGE_COLUMNS = "hero_image_url, logo_url, favicon_url, seo_image_url";

function hasDimensionInput(value: FormDataEntryValue | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Pusat persistensi Setting: satu alur (validasi -> koncurrency -> upload ->
 * GC) yang dipanggil tipis oleh action per-tab. Parsing & transformasi ada di
 * site-config/schema.ts, bukan di sini.
 */
async function persistSiteSection(
  section: SiteSettingsSection,
  formData: FormData,
): Promise<ActionResult> {
  await requireFeature("setting");

  const parsed = parseSiteSectionFormData(section, formData);
  if (!parsed.success) {
    return { error: validationErrorMessage(parsed, "Konfigurasi tidak valid.") };
  }

  const supabase = createAdminSupabase();
  const current = await checkedMutation(
    "site-settings.load",
    "Gagal membaca konfigurasi website.",
    supabase
      .from("site_settings")
      .select(
        `id, ${SITE_SETTINGS_IMAGE_COLUMNS}, hero_image_width, hero_image_height, updated_at`,
      )
      .eq("id", 1)
      .maybeSingle(),
    { notFoundMessage: "Baris konfigurasi website belum tersedia." },
  );
  if (!current.ok) return { error: current.error };

  const isSiteImageReferenced = async (url: string) => {
    const { data, error } = await supabase
      .from("site_settings")
      .select(SITE_SETTINGS_IMAGE_COLUMNS)
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(
      data && SITE_IMAGE_FIELDS.some((field) => data[field.column] === url),
    );
  };

  const images: Record<string, string | null> = {};
  const imageDimensions: Record<string, number | null> = {};
  const uploadedAssets: ManagedImageAsset[] = [];
  const sectionFields = SECTION_IMAGE_FIELDS[section];
  let heroDimensions: { width: number; height: number } | null = null;

  // Upacara dimensi hero hanya relevan untuk tab Beranda (satu-satunya gambar
  // dengan kolom width/height di database).
  if (section === "home") {
    const heroFile = formData.get(SITE_HERO_IMAGE_FIELD.formKey);
    const hasNewHero = heroFile instanceof File && heroFile.size > 0;
    const removesHero =
      formData.get(`${SITE_HERO_IMAGE_FIELD.formKey}_remove`) === "1";
    const rawHeroWidth = formData.get(SITE_HERO_IMAGE_FIELD.widthColumn);
    const rawHeroHeight = formData.get(SITE_HERO_IMAGE_FIELD.heightColumn);
    const hasHeroDimensionInput =
      hasDimensionInput(rawHeroWidth) || hasDimensionInput(rawHeroHeight);
    const currentHeroDimensions = normalizeMediaDimensions(
      current.data.hero_image_width,
      current.data.hero_image_height,
      UPLOAD_LIMITS.mediaMaxDimension,
    );
    heroDimensions = normalizeMediaDimensions(
      rawHeroWidth,
      rawHeroHeight,
      UPLOAD_LIMITS.mediaMaxDimension,
    );

    if (hasNewHero) {
      try {
        const measured = await readPhotoDimensions(heroFile);
        heroDimensions = normalizeMediaDimensions(
          measured.width,
          measured.height,
          UPLOAD_LIMITS.mediaMaxDimension,
        );
      } catch {
        return {
          error:
            "Dimensi file hero tidak dapat diverifikasi. Pilih atau edit ulang gambar lalu coba lagi.",
        };
      }
    }

    if (
      (hasNewHero ||
        (!removesHero &&
          Boolean(current.data.hero_image_url) &&
          (hasHeroDimensionInput || !currentHeroDimensions))) &&
      !heroDimensions
    ) {
      return {
        error:
          "Dimensi hero belum tersedia. Tunggu pratinjau selesai dimuat, atau pilih/edit ulang gambar lalu simpan kembali.",
      };
    }

    // Backfill baris lama yang belum punya dimensi hero tersimpan.
    if (
      heroDimensions &&
      !hasNewHero &&
      !removesHero &&
      !currentHeroDimensions &&
      current.data.hero_image_url
    ) {
      imageDimensions[SITE_HERO_IMAGE_FIELD.widthColumn] = heroDimensions.width;
      imageDimensions[SITE_HERO_IMAGE_FIELD.heightColumn] = heroDimensions.height;
    }
  }

  for (const field of sectionFields) {
    const file = formData.get(field.formKey);
    if (file instanceof File && file.size > 0) {
      const uploaded = await uploadManagedImage(field.kind, file);
      if (!uploaded.ok) {
        await removeManagedImagesIfUnused(
          uploadedAssets,
          isSiteImageReferenced,
        );
        return { error: uploaded.error };
      }
      uploadedAssets.push(uploaded.asset);
      images[field.column] = uploaded.asset.url;
      if (field === SITE_HERO_IMAGE_FIELD) {
        imageDimensions[field.widthColumn] = heroDimensions?.width ?? null;
        imageDimensions[field.heightColumn] = heroDimensions?.height ?? null;
      }
    } else if (formData.get(`${field.formKey}_remove`) === "1") {
      images[field.column] = null;
      if (field === SITE_HERO_IMAGE_FIELD) {
        imageDimensions[field.widthColumn] = null;
        imageDimensions[field.heightColumn] = null;
      }
    }
  }

  const update = {
    ...toSiteSectionUpdate(section, parsed.data),
    ...images,
    ...imageDimensions,
  };
  const saved = await checkedMutation(
    "site-settings.update",
    "Gagal menyimpan konfigurasi website.",
    supabase
      .from("site_settings")
      .update(update)
      .eq("id", 1)
      .eq("updated_at", current.data.updated_at)
      .select("id")
      .maybeSingle(),
    {
      notFoundMessage:
        "Pengaturan berubah di sesi lain. Muat ulang halaman lalu simpan kembali.",
    },
  );
  if (!saved.ok) {
    await removeManagedImagesIfUnused(
      uploadedAssets,
      isSiteImageReferenced,
    );
    return { error: saved.error };
  }

  const replacedAssets = sectionFields.flatMap((field) => {
    const previousUrl = current.data[field.column];
    const nextUrl = Object.hasOwn(images, field.column)
      ? images[field.column]
      : previousUrl;
    return previousUrl && previousUrl !== nextUrl
      ? [{ kind: field.kind, url: previousUrl } satisfies ManagedImageAsset]
      : [];
  });
  await removeManagedImagesIfUnused(replacedAssets, isSiteImageReferenced);

  revalidatePath("/", "layout");
  return {};
}

/** Action tipis per-tab Setting; tiap tab memakai useAdminFormAction sendiri. */
export async function saveIdentitySettings(formData: FormData): Promise<ActionResult> {
  return persistSiteSection("identity", formData);
}

export async function saveHomeSettings(formData: FormData): Promise<ActionResult> {
  return persistSiteSection("home", formData);
}

export async function saveSeoSettings(formData: FormData): Promise<ActionResult> {
  return persistSiteSection("seo", formData);
}

export async function saveContactSettings(formData: FormData): Promise<ActionResult> {
  return persistSiteSection("contact", formData);
}
