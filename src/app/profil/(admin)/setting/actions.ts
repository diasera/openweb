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
import { revalidateSeoIndexes } from "@/lib/seo/revalidate";

/** Gambar milik tiap tab; upload & GC hanya menyentuh field section aktif. */
const SECTION_IMAGE_FIELDS: Record<SiteSettingsSection, (typeof SITE_IMAGE_FIELDS)[number][]> = {
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

type HeroDimensionPlan =
  | { ok: true; columns: Record<string, number | null>; uploadDimensions: { width: number; height: number } | null }
  | { ok: false; error: string };

/**
 * Dimensi hero (satu-satunya gambar dengan kolom width/height): ukur file
 * baru di server, tolak simpan bila dimensi belum diketahui, dan backfill
 * baris lama yang belum punya metadata ukuran.
 */
async function planHeroDimensions(
  formData: FormData,
  current: { hero_image_url: string | null; hero_image_width: number | null; hero_image_height: number | null },
): Promise<HeroDimensionPlan> {
  const heroFile = formData.get(SITE_HERO_IMAGE_FIELD.formKey);
  const hasNewHero = heroFile instanceof File && heroFile.size > 0;
  const removesHero = formData.get(`${SITE_HERO_IMAGE_FIELD.formKey}_remove`) === "1";
  const rawWidth = formData.get(SITE_HERO_IMAGE_FIELD.widthColumn);
  const rawHeight = formData.get(SITE_HERO_IMAGE_FIELD.heightColumn);
  const currentDimensions = normalizeMediaDimensions(
    current.hero_image_width,
    current.hero_image_height,
    UPLOAD_LIMITS.mediaMaxDimension,
  );
  let dimensions = normalizeMediaDimensions(rawWidth, rawHeight, UPLOAD_LIMITS.mediaMaxDimension);

  if (hasNewHero) {
    try {
      const measured = await readPhotoDimensions(heroFile);
      dimensions = normalizeMediaDimensions(
        measured.width,
        measured.height,
        UPLOAD_LIMITS.mediaMaxDimension,
      );
    } catch {
      return {
        ok: false,
        error: "Dimensi file hero tidak dapat diverifikasi. Pilih atau edit ulang gambar lalu coba lagi.",
      };
    }
  }

  const needsDimensions =
    hasNewHero ||
    (!removesHero &&
      Boolean(current.hero_image_url) &&
      (hasDimensionInput(rawWidth) || hasDimensionInput(rawHeight) || !currentDimensions));
  if (needsDimensions && !dimensions) {
    return {
      ok: false,
      error:
        "Dimensi hero belum tersedia. Tunggu pratinjau selesai dimuat, atau pilih/edit ulang gambar lalu simpan kembali.",
    };
  }

  // Backfill baris lama yang belum punya dimensi hero tersimpan.
  const backfill: Record<string, number | null> = {};
  if (dimensions && !hasNewHero && !removesHero && !currentDimensions && current.hero_image_url) {
    backfill[SITE_HERO_IMAGE_FIELD.widthColumn] = dimensions.width;
    backfill[SITE_HERO_IMAGE_FIELD.heightColumn] = dimensions.height;
  }
  return { ok: true, columns: backfill, uploadDimensions: dimensions };
}

/**
 * Pusat persistensi Setting: satu alur (validasi -> cek konkurensi -> upload ->
 * GC -> revalidasi) yang dipanggil tipis oleh action per-tab. Parsing &
 * transformasi kolom ada di site-config/schema.ts, bukan di sini.
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
      .select(`id, ${SITE_SETTINGS_IMAGE_COLUMNS}, hero_image_width, hero_image_height, updated_at`)
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
    return Boolean(data && SITE_IMAGE_FIELDS.some((field) => data[field.column] === url));
  };

  const hero = section === "home" ? await planHeroDimensions(formData, current.data) : null;
  if (hero && !hero.ok) return { error: hero.error };

  const images: Record<string, string | null> = {};
  const imageDimensions: Record<string, number | null> = { ...(hero?.ok ? hero.columns : {}) };
  const uploadedAssets: ManagedImageAsset[] = [];
  const sectionFields = SECTION_IMAGE_FIELDS[section];

  for (const field of sectionFields) {
    const file = formData.get(field.formKey);
    const isHero = field === SITE_HERO_IMAGE_FIELD;
    if (file instanceof File && file.size > 0) {
      const uploaded = await uploadManagedImage(field.kind, file);
      if (!uploaded.ok) {
        await removeManagedImagesIfUnused(uploadedAssets, isSiteImageReferenced);
        return { error: uploaded.error };
      }
      uploadedAssets.push(uploaded.asset);
      images[field.column] = uploaded.asset.url;
      if (isHero) {
        const dimensions = hero?.ok ? hero.uploadDimensions : null;
        imageDimensions[SITE_HERO_IMAGE_FIELD.widthColumn] = dimensions?.width ?? null;
        imageDimensions[SITE_HERO_IMAGE_FIELD.heightColumn] = dimensions?.height ?? null;
      }
    } else if (formData.get(`${field.formKey}_remove`) === "1") {
      images[field.column] = null;
      if (isHero) {
        imageDimensions[SITE_HERO_IMAGE_FIELD.widthColumn] = null;
        imageDimensions[SITE_HERO_IMAGE_FIELD.heightColumn] = null;
      }
    }
  }

  const saved = await checkedMutation(
    "site-settings.update",
    "Gagal menyimpan konfigurasi website.",
    supabase
      .from("site_settings")
      .update({ ...toSiteSectionUpdate(section, parsed.data), ...images, ...imageDimensions })
      .eq("id", 1)
      .eq("updated_at", current.data.updated_at)
      .select("id")
      .maybeSingle(),
    { notFoundMessage: "Pengaturan berubah di sesi lain. Muat ulang halaman lalu simpan kembali." },
  );
  if (!saved.ok) {
    await removeManagedImagesIfUnused(uploadedAssets, isSiteImageReferenced);
    return { error: saved.error };
  }

  const replacedAssets = sectionFields.flatMap((field) => {
    const previousUrl = current.data[field.column];
    const nextUrl = Object.hasOwn(images, field.column) ? images[field.column] : previousUrl;
    return previousUrl && previousUrl !== nextUrl
      ? [{ kind: field.kind, url: previousUrl } satisfies ManagedImageAsset]
      : [];
  });
  await removeManagedImagesIfUnused(replacedAssets, isSiteImageReferenced);

  // Identitas, tema, dan hero dibaca root layout: seluruh halaman ikut segar.
  revalidatePath("/", "layout");
  // Canonical URL dan sakelar indexing menentukan isi robots/sitemap/feed.
  revalidatePath("/robots.txt");
  revalidatePath("/manifest.webmanifest");
  revalidateSeoIndexes();
  return {};
}

/** Action tipis per-tab Setting; tiap tab memakai form & tombol simpannya sendiri. */
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
