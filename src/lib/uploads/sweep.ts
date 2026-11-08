import "server-only";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { isSchemaOutdatedError } from "@/lib/database/errors";
import { consumeRateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getStoragePublicUrl } from "@/lib/storage";
import { UPLOAD_TICKET_TTL_SECONDS } from "./ticket";

const SWEEP_BATCH = 100;
/** Batas halaman per target per sapuan; sisa diteruskan sapuan berikutnya. */
const SWEEP_MAX_PAGES = 20;
/** Setelah tiket kedaluwarsa, objek tanpa baris DB tidak mungkin difinalisasi lagi. */
const DIRECT_UPLOAD_GRACE_MS = (UPLOAD_TICKET_TTL_SECONDS + 60 * 60) * 1000;
/** Draf artikel bisa terbuka berjam-jam sebelum disimpan. */
const ARTICLE_IMAGE_GRACE_MS = 48 * 60 * 60 * 1000;

type SweepTarget = {
  bucket: string;
  folder: string;
  graceMs: number;
  /** Hanya objek dengan nama yang cocok yang boleh disapu. */
  names?: RegExp;
  /** Path yang masih dipakai; null bila status referensi tidak pasti. */
  referencedPaths: (paths: string[]) => Promise<Set<string> | null>;
};

/**
 * Media dirujuk lewat url (objek utama) maupun thumbnail_url (poster video),
 * baik di baris pin (`media`) maupun slide carousel (`media_slides`).
 */
async function referencedMediaPaths(paths: string[]) {
  const urls = new Map(
    paths.map((path) => [getStoragePublicUrl(STORAGE_BUCKETS.media, path), path]),
  );
  const sb = createAdminSupabase();
  const candidates = [...urls.keys()];
  const [pinUrls, pinPosters, slideUrls, slidePosters] = await Promise.all([
    sb.from("media").select("url").in("url", candidates),
    sb.from("media").select("thumbnail_url").in("thumbnail_url", candidates),
    sb.from("media_slides").select("url").in("url", candidates),
    sb.from("media_slides").select("thumbnail_url").in("thumbnail_url", candidates),
  ]);
  if (pinUrls.error || pinPosters.error) return null;
  // Tabel slide belum dimigrasi berarti belum ada slide; error lain fail-closed.
  const slideError = slideUrls.error ?? slidePosters.error;
  if (slideError && !isSchemaOutdatedError(slideError)) return null;
  const referencedUrls = [
    ...pinUrls.data.map((row) => row.url),
    ...pinPosters.data.map((row) => row.thumbnail_url),
    ...(slideUrls.data ?? []).map((row) => row.url),
    ...(slidePosters.data ?? []).map((row) => row.thumbnail_url),
  ];
  return new Set(
    referencedUrls.flatMap((url) => (url ? (urls.get(url) ?? []) : [])),
  );
}

async function referencedTrackPaths(paths: string[]) {
  const { data, error } = await createAdminSupabase()
    .from("music_tracks")
    .select("storage_path")
    .in("storage_path", paths);
  if (error) return null;
  return new Set(data.map((row) => row.storage_path));
}

async function referencedArticlePaths(paths: string[]) {
  const { data, error } = await createAdminSupabase().rpc(
    "blog_asset_paths_in_use",
    { p_paths: paths },
  );
  if (error) return null;
  return new Set(data ?? []);
}

const SWEEP_TARGETS: readonly SweepTarget[] = [
  {
    bucket: STORAGE_BUCKETS.mediaInbox,
    folder: "public",
    graceMs: DIRECT_UPLOAD_GRACE_MS,
    referencedPaths: referencedMediaPaths,
  },
  {
    bucket: STORAGE_BUCKETS.mediaInbox,
    folder: "admin",
    graceMs: DIRECT_UPLOAD_GRACE_MS,
    referencedPaths: referencedMediaPaths,
  },
  {
    bucket: STORAGE_BUCKETS.music,
    folder: "tracks",
    graceMs: DIRECT_UPLOAD_GRACE_MS,
    referencedPaths: referencedTrackPaths,
  },
  {
    // Gambar inline artikel yang dibuang dari editor/draf tak pernah disimpan.
    bucket: STORAGE_BUCKETS.blog,
    folder: "",
    graceMs: ARTICLE_IMAGE_GRACE_MS,
    names: /^(?:in|cover)-/,
    referencedPaths: referencedArticlePaths,
  },
];

/**
 * Telusuri objek tertua lebih dulu, halaman demi halaman, sampai bertemu objek
 * yang masih dalam masa tenggang. Objek yang masih dirujuk (mis. media pending
 * atau ditolak) dilewati, sehingga unggahan terlantar yang lebih baru tetap
 * terjangkau meski ada ratusan objek lama yang sah.
 */
async function sweepTarget(target: SweepTarget, now: number): Promise<number> {
  const storage = createAdminSupabase().storage.from(target.bucket);
  const cutoff = now - target.graceMs;
  const prefix = target.folder ? `${target.folder}/` : "";
  let offset = 0;
  let removedTotal = 0;

  for (let page = 0; page < SWEEP_MAX_PAGES; page += 1) {
    const { data, error } = await storage.list(target.folder, {
      limit: SWEEP_BATCH,
      offset,
      sortBy: { column: "created_at", order: "asc" },
    });
    if (error || !data || data.length === 0) break;

    // Folder tidak punya id/created_at; hanya objek file yang dinilai.
    const files = data.flatMap((object) =>
      object.id && object.created_at
        ? [{ name: object.name, createdAt: Date.parse(object.created_at) }]
        : [],
    );
    const stale = files
      .filter(
        (file) =>
          file.createdAt < cutoff && (!target.names || target.names.test(file.name)),
      )
      .map((file) => `${prefix}${file.name}`);
    const reachedFresh = files.some((file) => file.createdAt >= cutoff);

    let removed = 0;
    if (stale.length > 0) {
      const referenced = await target.referencedPaths(stale);
      if (!referenced) break; // fail-closed: jangan hapus bila referensi tidak pasti
      const abandoned = stale.filter((path) => !referenced.has(path));
      if (abandoned.length > 0) {
        const { error: removeError } = await storage.remove(abandoned);
        if (!removeError) removed = abandoned.length;
      }
    }
    removedTotal += removed;

    if (reachedFresh || data.length < SWEEP_BATCH) break;
    // Objek yang dihapus menggeser daftar; offset maju hanya sebanyak yang tersisa.
    offset += data.length - removed;
  }
  return removedTotal;
}

/**
 * Bersihkan unggahan yang tidak pernah difinalisasi (tab ditutup, koneksi
 * putus) dan gambar artikel yang tidak lagi dirujuk. Dibatasi global.
 */
export async function sweepAbandonedUploads(): Promise<void> {
  try {
    const slot = await consumeRateLimit(RATE_LIMITS.uploadSweep, ["global"]);
    if (!slot.ok || !slot.allowed) return;

    const now = Date.now();
    const removed = await Promise.all(
      SWEEP_TARGETS.map((target) => sweepTarget(target, now)),
    );
    const total = removed.reduce((sum, count) => sum + count, 0);
    if (total > 0) {
      console.info("[uploads:sweep] objek yatim dibersihkan", { total });
    }
  } catch (error) {
    console.warn("[uploads:sweep] sapuan gagal", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
