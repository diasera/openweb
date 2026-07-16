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
} from "@/lib/media-formats/registry";

// Nama cookie
export const SESSION_COOKIE = "kelas_session"; // sesi owner/admin (signed, HttpOnly)
export const VISITOR_COOKIE = "kelas_visitor"; // id pengunjung anonim (tracking)

// Storage bucket Supabase
export const STORAGE_BUCKETS = {
  media: "media", // foto/video publik & admin
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
  "music",
  "pengunjung",
  "admin",
  "setting",
] as const;
export type AdminFeature = (typeof ADMIN_FEATURES)[number];

/**
 * Metadata dan alamat tiap fitur admin. `stats` hidup langsung di Admin Home;
 * fitur lain membuka child view di bawah /profil.
 */
export const ADMIN_FEATURE_META: Record<
  AdminFeature,
  { label: string; ownerOnly: boolean; href: string }
> = {
  stats: { label: "Ringkasan", ownerOnly: false, href: "/profil" },
  pesan: { label: "Pesan", ownerOnly: false, href: "/profil/pesan" },
  media: { label: "Media", ownerOnly: false, href: "/profil/media" },
  anggota: { label: "Anggota", ownerOnly: false, href: "/profil/anggota" },
  blog: { label: "Blog", ownerOnly: false, href: "/profil/blog" },
  music: { label: "Musik", ownerOnly: false, href: "/profil/music" },
  pengunjung: {
    label: "Pengunjung",
    ownerOnly: false,
    href: "/profil/pengunjung",
  },
  admin: { label: "Admin", ownerOnly: true, href: "/profil/admin" },
  setting: { label: "Pengaturan", ownerOnly: true, href: "/profil/setting" },
};

export const ADMIN_AUTH_PATHS = {
  login: "/profil/login",
  setup: "/profil/setup",
} as const;

export function adminFeatureHref(feature: AdminFeature): string {
  return ADMIN_FEATURE_META[feature].href;
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
}

/**
 * Sumber tunggal judul dan hierarki child view admin untuk Dynamic Island.
 * Route auth sengaja tidak termasuk karena tampil sebagai alur modal terpisah.
 */
export function getAdminRouteNavigation(
  pathname: string,
): AdminRouteNavigation | null {
  const feature = ADMIN_CHILD_FEATURES.find((item) =>
    matchesPath(pathname, adminFeatureHref(item)),
  );
  if (!feature) return null;

  if (pathname === "/profil/blog/new") {
    return { title: "Tulis Artikel", backHref: "/profil/blog" };
  }
  if (feature === "blog" && pathname !== adminFeatureHref("blog")) {
    return { title: "Edit Artikel", backHref: "/profil/blog" };
  }
  if (feature === "media" && pathname !== adminFeatureHref("media")) {
    return { title: "Edit Foto", backHref: "/profil/media" };
  }

  return {
    title: ADMIN_FEATURE_META[feature].label,
    backHref: "/profil",
  };
}

// Fitur yang boleh diberikan owner ke admin biasa (owner-only dikecualikan).
// Ditaruh di sini (client-safe) agar bisa diimpor komponen client & server.
export const ASSIGNABLE_FEATURES: AdminFeature[] = ADMIN_FEATURES.filter(
  (feature) => !ADMIN_FEATURE_META[feature].ownerOnly,
);

// Batas upload publik
export const UPLOAD_LIMITS = {
  imageMaxBytes: 10 * 1024 * 1024, // 10 MB
  videoMaxBytes: 50 * 1024 * 1024, // aman untuk batas global Supabase Free
  audioMaxBytes: 50 * 1024 * 1024, // aman untuk batas global Supabase Free
  /** Batas dimensi metadata foto/video, dipakai sama oleh browser dan API. */
  mediaMaxDimension: 20_000,
  imageMime: IMAGE_STORAGE_MIME_TYPES,
  videoMime: VIDEO_STORAGE_MIME_TYPES,
  audioMime: AUDIO_STORAGE_MIME_TYPES,
} as const;

/** Picker menerima sumber luas; normalizer membuat file storage yang portabel. */
export const IMAGE_UPLOAD_ACCEPT = IMAGE_SOURCE_ACCEPT;
export const MEDIA_UPLOAD_ACCEPT = MEDIA_SOURCE_ACCEPT;
export const AUDIO_UPLOAD_ACCEPT = AUDIO_SOURCE_ACCEPT;

export const PHOTO_EDITOR_HELP =
  "Editor tersedia untuk foto statis. HEIC/HEIF iPhone dinormalisasi otomatis; animasi dan video tidak diratakan diam-diam.";

export const AUDIO_UPLOAD_HELP =
  "MP3, M4A/AAC, Ogg/Opus, WebM, FLAC, dan WAV. M4P FairPlay/DRM tidak dapat diproses.";
