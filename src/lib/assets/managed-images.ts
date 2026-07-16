import "server-only";

import { STORAGE_BUCKETS } from "@/lib/constants";
import {
  getStoragePublicUrl,
  removeStorageObject,
  uploadToBucket,
} from "@/lib/storage";

const UUID_PATH =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

const MANAGED_IMAGE_SPECS = {
  "site-hero": { bucket: STORAGE_BUCKETS.site, prefix: "hero-" },
  "site-logo": { bucket: STORAGE_BUCKETS.site, prefix: "logo-" },
  "site-favicon": { bucket: STORAGE_BUCKETS.site, prefix: "favicon-" },
  "site-seo": { bucket: STORAGE_BUCKETS.site, prefix: "seo-" },
  "member-photo": { bucket: STORAGE_BUCKETS.members, prefix: "" },
  "blog-cover": { bucket: STORAGE_BUCKETS.blog, prefix: "cover-" },
} as const;

export type ManagedImageKind = keyof typeof MANAGED_IMAGE_SPECS;

export type ManagedImageAsset = {
  kind: ManagedImageKind;
  url: string;
};

type UploadManagedImageResult =
  | { ok: true; asset: ManagedImageAsset }
  | { ok: false; error: string };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Ambil path hanya dari public URL Supabase yang benar-benar dimiliki bucket
 * dan pola nama aplikasi. URL eksternal, nested path, serta path traversal
 * sengaja ditolak sebelum operasi hapus menyentuh Storage.
 */
function trustedManagedPath(kind: ManagedImageKind, rawUrl: string): string | null {
  const spec = MANAGED_IMAGE_SPECS[kind];

  try {
    const candidate = new URL(rawUrl);
    const marker = "__managed_image_root__";
    const bucketRoot = new URL(getStoragePublicUrl(spec.bucket, marker));
    const rootPath = bucketRoot.pathname.slice(0, -marker.length);

    if (
      candidate.origin !== bucketRoot.origin ||
      candidate.username ||
      candidate.password ||
      !candidate.pathname.startsWith(rootPath)
    ) {
      return null;
    }

    const encodedPath = candidate.pathname.slice(rootPath.length);
    const path = decodeURIComponent(encodedPath);
    if (!path || path.includes("/") || path.includes("\\") || path.includes("..")) {
      return null;
    }

    const expected = new RegExp(
      `^${escapeRegExp(spec.prefix)}${UUID_PATH}\\.[a-z0-9]{1,10}$`,
      "i",
    );
    return expected.test(path) ? path : null;
  } catch {
    return null;
  }
}

/** Satu pintu upload untuk seluruh gambar admin yang punya lifecycle DB. */
export async function uploadManagedImage(
  kind: ManagedImageKind,
  file: File,
): Promise<UploadManagedImageResult> {
  const spec = MANAGED_IMAGE_SPECS[kind];
  const uploaded = await uploadToBucket(spec.bucket, file, spec.prefix);
  if (uploaded.error || !uploaded.url) {
    return { ok: false, error: uploaded.error ?? "Gagal mengunggah gambar" };
  }
  return { ok: true, asset: { kind, url: uploaded.url } };
}

/**
 * Hapus best-effort dan fail-closed: bila pemeriksaan referensi gagal, objek
 * dipertahankan. Pemanggil wajib menjalankan ini setelah mutasi DB berhasil,
 * atau untuk rollback upload baru yang mutasi DB-nya gagal.
 */
export async function removeManagedImageIfUnused(
  asset: ManagedImageAsset,
  isReferenced: (url: string) => Promise<boolean>,
): Promise<boolean> {
  const path = trustedManagedPath(asset.kind, asset.url);
  if (!path) return false;

  try {
    if (await isReferenced(asset.url)) return false;
  } catch (error) {
    console.warn("[managed-image:cleanup] pemeriksaan referensi gagal", {
      kind: asset.kind,
      cause: error instanceof Error ? error.message : String(error),
    });
    return false;
  }

  return removeStorageObject(MANAGED_IMAGE_SPECS[asset.kind].bucket, path);
}

export async function removeManagedImagesIfUnused(
  assets: readonly ManagedImageAsset[],
  isReferenced: (url: string) => Promise<boolean>,
): Promise<void> {
  const uniqueAssets = [
    ...new Map(
      assets.map((asset) => [`${asset.kind}\0${asset.url}`, asset] as const),
    ).values(),
  ];
  await Promise.all(
    uniqueAssets.map((asset) =>
      removeManagedImageIfUnused(asset, isReferenced),
    ),
  );
}
