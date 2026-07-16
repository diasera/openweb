"use server";

import { revalidatePath } from "next/cache";
import {
  validationErrorMessage,
  type ActionResult,
} from "@/lib/action-result";
import { requireFeature } from "@/lib/auth";
import { checkedMutation } from "@/lib/database/mutation";
import {
  parseSiteConfigFormData,
  SITE_HERO_IMAGE_FIELD,
  SITE_IMAGE_FIELDS,
  toSiteSettingsUpdate,
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

function hasDimensionInput(value: FormDataEntryValue | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Server action tipis; parsing dan transformasi config hidup di satu pusat. */
export async function saveSiteSettings(formData: FormData): Promise<ActionResult> {
  await requireFeature("setting");

  const parsed = parseSiteConfigFormData(formData);
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
        "id, hero_image_url, hero_image_width, hero_image_height, logo_url, favicon_url, seo_image_url, updated_at",
      )
      .eq("id", 1)
      .maybeSingle(),
    { notFoundMessage: "Baris konfigurasi website belum tersedia." },
  );
  if (!current.ok) return { error: current.error };

  const isSiteImageReferenced = async (url: string) => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("hero_image_url, logo_url, favicon_url, seo_image_url")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(
      data && SITE_IMAGE_FIELDS.some((field) => data[field.column] === url),
    );
  };

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
  let heroDimensions = normalizeMediaDimensions(
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

  const images: Record<string, string | null> = {};
  const imageDimensions: Record<string, number | null> = {};
  const uploadedAssets: ManagedImageAsset[] = [];
  for (const field of SITE_IMAGE_FIELDS) {
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
      if ("widthColumn" in field && "heightColumn" in field) {
        imageDimensions[field.widthColumn] = heroDimensions?.width ?? null;
        imageDimensions[field.heightColumn] = heroDimensions?.height ?? null;
      }
    } else if (formData.get(`${field.formKey}_remove`) === "1") {
      images[field.column] = null;
      if ("widthColumn" in field && "heightColumn" in field) {
        imageDimensions[field.widthColumn] = null;
        imageDimensions[field.heightColumn] = null;
      }
    } else if (
      "widthColumn" in field &&
      "heightColumn" in field &&
      current.data[field.column] &&
      heroDimensions &&
      !currentHeroDimensions
    ) {
      imageDimensions[field.widthColumn] = heroDimensions.width;
      imageDimensions[field.heightColumn] = heroDimensions.height;
    }
  }

  const update = {
    ...toSiteSettingsUpdate(parsed.data),
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

  const replacedAssets = SITE_IMAGE_FIELDS.flatMap((field) => {
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
