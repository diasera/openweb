/**
 * Konstanta bersama seluruh aplikasi. Definisikan SEKALI di sini lalu pakai
 * ulang (menu profil admin, guard izin, editor admin, dsb) — pola sarang laba-laba.
 */

import {
  AUDIO_SOURCE_ACCEPT,
  AUDIO_STORAGE_MIME_TYPES,
  IMAGE_SOURCE_ACCEPT,
  IMAGE_STORAGE_MIME_TYPES,
  MEDIA_SOURCE_ACCEPT,
  VIDEO_STORAGE_MIME_TYPES,
  type MediaFormatKind,
} from "@/lib/media-formats/registry";
import type { SkeletonLayoutId } from "@/lib/navigation/app-routes";

// Nama cookie
export const SESSION_COOKIE = "kelas_session"; // sesi owner/admin (signed, HttpOnly)
export const DEVICE_COOKIE = "kelas_device"; // perangkat admin tepercaya (signed, HttpOnly)
export const VISITOR_COOKIE = "kelas_visitor"; // id pengunjung anonim (tracking)

// Storage bucket Supabase
export const STORAGE_BUCKETS = {
  media: "media", // foto/video publik & admin
  mediaInbox: "media-inbox", // PRIVAT: direct upload menunggu verifikasi/moderasi
  music: "music", // audio playlist Dynamic Island
  members: "members", // foto profil anggota
  blog: "blog", // gambar artikel
  site: "site", // hero, logo, favicon
} as const;

// Fitur admin — sumber tunggal untuk menu, guard route, & editor izin admin.
export const ADMIN_FEATURES = [
  "stats",
  "pesan",
  "media",
  "anggota",
  "blog",
  "agenda",
  "music",
  "pengunjung",
  "admin",
  "setting",
] as const;
export type AdminFeature = (typeof ADMIN_FEATURES)[number];

/**
 * Metadata dan alamat tiap fitur admin. `stats` hidup langsung di Admin Home;
 * fitur lain membuka child view di bawah /profil. `skeleton` = kerangka yang
 * tampil saat halaman fitur dimuat.
 */
export const ADMIN_FEATURE_META: Record<
  AdminFeature,
  { label: string; ownerOnly: boolean; href: string; skeleton: SkeletonLayoutId }
> = {
  stats: { label: "Ringkasan", ownerOnly: false, href: "/profil", skeleton: "hub" },
  pesan: { label: "Pesan", ownerOnly: false, href: "/profil/pesan", skeleton: "admin-list" },
  media: { label: "Media", ownerOnly: false, href: "/profil/media", skeleton: "admin-grid" },
  anggota: { label: "Anggota", ownerOnly: false, href: "/profil/anggota", skeleton: "admin-list" },
  blog: { label: "Blog", ownerOnly: false, href: "/profil/blog", skeleton: "admin-list" },
  agenda: { label: "Agenda", ownerOnly: false, href: "/profil/agenda", skeleton: "admin-list" },
  music: { label: "Musik", ownerOnly: false, href: "/profil/music", skeleton: "admin-list" },
  pengunjung: {
    label: "Pengunjung",
    ownerOnly: false,
    href: "/profil/pengunjung",
    skeleton: "admin-list",
  },
  admin: { label: "Admin", ownerOnly: true, href: "/profil/admin", skeleton: "admin-list" },
  setting: { label: "Pengaturan", ownerOnly: true, href: "/profil/setting", skeleton: "admin-form" },
};

export const ADMIN_AUTH_PATHS = {
  login: "/profil/login",
  setup: "/profil/setup",
} as const;

export function adminFeatureHref(feature: AdminFeature): string {
  return ADMIN_FEATURE_META[feature].href;
}

/** Tab filter tertentu pada daftar admin (?status=…), sama dengan href AdminTabs. */
export function adminFilterHref(feature: AdminFeature, status: string): string {
  return `${adminFeatureHref(feature)}?status=${encodeURIComponent(status)}`;
}

const ADMIN_CHILD_FEATURES = ADMIN_FEATURES.filter(
  (feature): feature is Exclude<AdminFeature, "stats"> => feature !== "stats",
);

/**
 * Seluruh path yang dimiliki area admin/auth di bawah `/profil`.
 * Dipakai guard route, robots, dan generator slug agar daftar route tidak drift.
 */
export const ADMIN_MANAGED_PATHS: readonly string[] = [
  ...Object.values(ADMIN_AUTH_PATHS),
  ...ADMIN_CHILD_FEATURES.map(adminFeatureHref),
];

function matchesPath(pathname: string, basePath: string): boolean {
  return pathname === basePath || pathname.startsWith(`${basePath}/`);
}

/** Benar hanya untuk route pengelolaan admin, bukan /profil atau profil anggota. */
export function isAdminProfileRoute(pathname: string): boolean {
  return ADMIN_MANAGED_PATHS.some((path) => matchesPath(pathname, path));
}

export function isAdminAuthRoute(pathname: string): boolean {
  return Object.values(ADMIN_AUTH_PATHS).some((path) =>
    matchesPath(pathname, path),
  );
}

export interface AdminRouteNavigation {
  title: string;
  backHref: string;
  /** Kerangka pemuatan child view ini. */
  skeleton: SkeletonLayoutId;
}

/** Sub-halaman moderasi di bawah fitur Media (bukan fitur izin tersendiri). */
export const MEDIA_ADMIN_SECTIONS = {
  album: { href: "/profil/media/album", title: "Album" },
  komentar: { href: "/profil/media/komentar", title: "Komentar" },
} as const;

/*
 * Satu editor per jenis konten, satu kali klik membuka semuanya:
 * - Edit postingan — pin Media: media (edit foto item ke-n, tambah, hapus,
 *                    urutkan, sampul) + teks, album, sorotan, tanggal.
 * - Edit artikel   — artikel blog: tulisan, status, cover, SEO.
 */

/** Editor "Edit postingan" sebuah pin (media + detail). */
export function adminMediaEditHref(mediaId: string): string {
  return `${ADMIN_FEATURE_META.media.href}/${mediaId}/edit`;
}

/** Editor artikel blog; tanpa id = tulis artikel baru. */
export function adminBlogEditorHref(postId?: string): string {
  return `${ADMIN_FEATURE_META.blog.href}/${postId ?? "new"}`;
}

/**
 * Sumber tunggal judul, hierarki, dan kerangka pemuatan child view admin
 * (Dynamic Island + RouteSkeleton). Route auth sengaja tidak termasuk karena
 * tampil sebagai alur modal terpisah.
 */
export function getAdminRouteNavigation(
  pathname: string,
): AdminRouteNavigation | null {
  const feature = ADMIN_CHILD_FEATURES.find((item) =>
    matchesPath(pathname, adminFeatureHref(item)),
  );
  if (!feature) return null;

  if (pathname === adminBlogEditorHref()) {
    return { title: "Tulis Artikel", backHref: adminFeatureHref("blog"), skeleton: "admin-editor" };
  }
  if (feature === "blog" && pathname !== adminFeatureHref("blog")) {
    return { title: "Edit Artikel", backHref: adminFeatureHref("blog"), skeleton: "admin-editor" };
  }
  if (feature === "media" && pathname !== adminFeatureHref("media")) {
    const section = Object.values(MEDIA_ADMIN_SECTIONS).find((item) =>
      matchesPath(pathname, item.href),
    );
    if (section) {
      return { title: section.title, backHref: adminFeatureHref("media"), skeleton: "admin-list" };
    }
    return { title: "Edit Postingan", backHref: adminFeatureHref("media"), skeleton: "admin-editor" };
  }

  const meta = ADMIN_FEATURE_META[feature];
  return { title: meta.label, backHref: "/profil", skeleton: meta.skeleton };
}

// Fitur yang boleh diberikan owner ke admin biasa (owner-only dikecualikan).
// Ditaruh di sini (client-safe) agar bisa diimpor komponen client & server.
export const ASSIGNABLE_FEATURES: AdminFeature[] = ADMIN_FEATURES.filter(
  (feature) => !ADMIN_FEATURE_META[feature].ownerOnly,
);

/**
 * Batas upload satu sumber untuk picker, policy signed upload, pesan error,
 * `file_size_limit` bucket di schema.sql, dan `bodySizeLimit` Server Action di
 * next.config.mjs (keduanya dicek `npm run check:media-formats`).
 * Supabase Free membatasi SETIAP file maksimal 50 MB lewat Global file size
 * limit; angka di atas itu baru berlaku pada paket Pro/self-hosted.
 */
export const UPLOAD_LIMITS = {
  imageMaxBytes: 100 * 1024 * 1024, // 100 MB
  videoMaxBytes: 500 * 1024 * 1024, // 500 MB
  audioMaxBytes: 500 * 1024 * 1024, // 500 MB
  /** Batas dimensi metadata foto/video, dipakai sama oleh browser dan API. */
  mediaMaxDimension: 20_000,
  /**
   * Item per pin carousel (sampul + slide). Sinkron dengan batas posisi
   * `media_slides` di schema.sql (dicek `npm run check:schema`).
   */
  mediaPerPost: 10,
  imageMime: IMAGE_STORAGE_MIME_TYPES,
  videoMime: VIDEO_STORAGE_MIME_TYPES,
  audioMime: AUDIO_STORAGE_MIME_TYPES,
} as const;

/** Batas byte per jenis media; dipakai normalizer browser dan policy server. */
export function uploadMaxBytes(kind: MediaFormatKind): number {
  if (kind === "video") return UPLOAD_LIMITS.videoMaxBytes;
  if (kind === "audio") return UPLOAD_LIMITS.audioMaxBytes;
  return UPLOAD_LIMITS.imageMaxBytes;
}

/** Label batas yang sama di setiap pesan validasi, mis. "100 MB". */
export function formatUploadLimit(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/**
 * Masa simpan data teknis (IP, browser/perangkat). Dipakai fungsi SQL
 * apply_data_retention dan dijelaskan apa adanya di halaman Privasi.
 */
export const DATA_RETENTION_DAYS = 180;

/**
 * Koleksi Tersimpan milik perangkat: total item yang diingat browser dan
 * jumlah id per permintaan /api/tersimpan (URL tetap pendek). Klien memecah
 * koleksi besar menjadi beberapa permintaan agar tidak ada item terlewat.
 */
export const SAVED_ITEM_LIMITS = {
  maxItems: 300,
  idsPerRequest: 60,
} as const;

/** Picker menerima sumber luas; normalizer membuat file storage yang portabel. */
export const IMAGE_UPLOAD_ACCEPT = IMAGE_SOURCE_ACCEPT;
export const MEDIA_UPLOAD_ACCEPT = MEDIA_SOURCE_ACCEPT;
export const AUDIO_UPLOAD_ACCEPT = AUDIO_SOURCE_ACCEPT;

export const PHOTO_EDITOR_HELP =
  "Editor tersedia untuk foto statis. HEIC/HEIF iPhone dinormalisasi otomatis; animasi dan video tidak diratakan diam-diam.";

export const AUDIO_UPLOAD_HELP =
  "MP3, M4A/AAC, Ogg/Opus, WebM, FLAC, dan WAV. M4P FairPlay/DRM tidak dapat diproses.";
