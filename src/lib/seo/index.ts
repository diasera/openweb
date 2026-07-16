import type { Metadata } from "next";
import {
  DEFAULT_SITE_DESCRIPTION,
  getContentLabels,
  getSiteOrigin,
  toAbsoluteSiteUrl,
} from "@/lib/site-config";
import type { SiteSettingsRow } from "@/lib/types/database";

export {
  normalizeAdsenseClientId,
  normalizeAnalyticsId,
} from "@/lib/site-config/external-identifiers";

export const PUBLIC_PAGE_SEO = {
  blog: {
    title: "Artikel",
    description: "Artikel, kabar, karya, dan cerita terbaru dari {siteName}.",
    path: "/blog",
  },
  galeri: {
    title: "Galeri",
    description: "Dokumentasi foto dan video kegiatan, karya, serta kebersamaan {memberPlural} {siteName}.",
    path: "/galeri",
  },
  anggota: {
    title: "Anggota",
    description: "Kenali profil dan peran {memberPlural} yang menjadi bagian dari {siteName}.",
    path: "/anggota",
  },
  profil: {
    title: "Profil",
    description: "Profil, statistik karya, galeri, artikel, dan informasi tentang {siteName}.",
    path: "/profil",
  },
  pesan: {
    title: "Pesan Anonim",
    description: "Ruang pesan anonim pilihan yang ditampilkan oleh pengelola {siteName}.",
    path: "/pesan",
  },
  notifikasi: {
    title: "Notifikasi",
    description: "Pembaruan dan pengumuman terbaru dari {siteName}.",
    path: "/notifikasi",
  },
  tentang: {
    title: "Tentang",
    description: "Visi, misi, tim inti, kontak, dan informasi lengkap {siteName}.",
    path: "/tentang",
  },
  privasi: {
    title: "Kebijakan Privasi",
    description: "Penjelasan pengelolaan data, cookie, analitik, dan periklanan pada {siteName}.",
    path: "/privasi",
  },
} as const;

/** Metadata judul admin terpusat agar suffix tidak tersebar di setiap page. */
export function buildAdminPageMetadata(title: string): Metadata {
  return { title: `${title} · Profil Admin` };
}

/** Alias stabil untuk pemakai lama; pusat origin sebenarnya ada di site-config. */
export const getSiteUrl = getSiteOrigin;
export const absoluteUrl = toAbsoluteSiteUrl;

export function getSiteAlternateName(settings: SiteSettingsRow) {
  return settings.site_alternate_name?.trim() || undefined;
}

export function getHomeSeoTitle(settings: SiteSettingsRow) {
  if (settings.seo_home_title?.trim()) return settings.seo_home_title.trim();
  const context = settings.tagline?.trim() || "Profil, kegiatan, karya, dan cerita";
  return `${settings.site_name} — ${context}`;
}

export function getHomeSeoDescription(settings: SiteSettingsRow) {
  return (
    settings.seo_home_description?.trim() ||
    settings.description?.trim() ||
    DEFAULT_SITE_DESCRIPTION
  );
}

export function plainText(value: string | null | undefined, max = 170) {
  if (!value) return "";
  const text = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

interface PageMetadataInput {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "article";
  absoluteTitle?: boolean;
  noIndex?: boolean;
  publishedTime?: string | null;
  modifiedTime?: string | null;
  authors?: string[];
}

function localizeTemplate(value: string, settings: SiteSettingsRow) {
  const labels = getContentLabels(settings);
  return value
    .replaceAll("{siteName}", settings.site_name)
    .replaceAll("{memberSingular}", labels.memberSingular)
    .replaceAll("{memberPlural}", labels.memberPlural);
}

function openGraphLocale(locale: string) {
  return locale.replace("-", "_");
}

/** Pembangun metadata tunggal agar canonical, robots, Open Graph, dan kartu sosial konsisten. */
export function buildPageMetadata(
  settings: SiteSettingsRow,
  input: PageMetadataInput,
): Metadata {
  const canonical = absoluteUrl(input.path, settings);
  const titleText = localizeTemplate(input.title, settings);
  const description = localizeTemplate(input.description, settings);
  const image =
    input.image ??
    settings.seo_image_url ??
    settings.hero_image_url ??
    settings.logo_url;
  const images = image ? [absoluteUrl(image, settings)] : undefined;
  const title = input.absoluteTitle
    ? ({ absolute: titleText } as const)
    : titleText;
  const noIndex = input.noIndex || !settings.seo_indexing_enabled;
  const openGraphBase = {
    title: titleText,
    description,
    url: canonical,
    siteName: settings.site_name,
    locale: openGraphLocale(settings.locale),
    images,
  };

  return {
    title,
    description,
    keywords: settings.keywords ?? undefined,
    alternates: { canonical },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
    openGraph:
      input.type === "article"
        ? {
            ...openGraphBase,
            type: "article",
            publishedTime: input.publishedTime ?? undefined,
            modifiedTime: input.modifiedTime ?? undefined,
            authors: input.authors,
          }
        : { ...openGraphBase, type: "website" },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: titleText,
      description,
      images,
    },
  };
}
