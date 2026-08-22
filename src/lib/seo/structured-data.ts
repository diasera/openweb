import { memberProfilePath } from "@/lib/members/slug";
import type {
  BlogPostRow,
  MediaRow,
  MemberRow,
  SiteSettingsRow,
} from "@/lib/types/database";
import {
  absoluteUrl,
  getSiteAlternateName,
  getSiteUrl,
  getSocialImageUrl,
  OG_CARD_PATH,
  plainText,
} from "./index";

type Schema = Record<string, unknown>;

function organizationType(settings: SiteSettingsRow) {
  if (settings.site_type === "school") return "School";
  if (settings.site_type === "campus") return "CollegeOrUniversity";
  return "Organization";
}
function organizationNode(settings: SiteSettingsRow): Schema {
  const siteUrl = getSiteUrl(settings);
  const socialUrls = Object.values(settings.social ?? {}).filter(Boolean);
  return {
    "@type": organizationType(settings),
    "@id": `${siteUrl}/#organization`,
    name: settings.site_name,
    alternateName: getSiteAlternateName(settings),
    description: settings.description || undefined,
    url: `${siteUrl}/`,
    logo: settings.logo_url
      ? { "@type": "ImageObject", url: absoluteUrl(settings.logo_url, settings) }
      : undefined,
    email: settings.contact_email || undefined,
    telephone: settings.contact_phone || undefined,
    address: settings.contact_address
      ? { "@type": "PostalAddress", streetAddress: settings.contact_address }
      : undefined,
    sameAs: socialUrls.length ? socialUrls : undefined,
  };
}

export function homeStructuredData(settings: SiteSettingsRow): Schema {
  const siteUrl = getSiteUrl(settings);
  const organization = organizationNode(settings);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: settings.site_name,
        alternateName: getSiteAlternateName(settings),
        description: settings.description || undefined,
        url: `${siteUrl}/`,
        inLanguage: settings.locale,
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      organization,
    ],
  };
}

export function breadcrumbStructuredData(
  settings: SiteSettingsRow,
  items: Array<{ name: string; path: string }>,
): Schema {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path, settings),
    })),
  };
}

export function articleStructuredData(
  settings: SiteSettingsRow,
  post: BlogPostRow,
): Schema {
  const description =
    post.excerpt || plainText(post.content_html, 170) || post.title;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`, settings),
    headline: post.title,
    description,
    // Rich result artikel menuntut gambar; tanpa cover jatuh ke gambar situs.
    image: [
      absoluteUrl(
        post.cover_image_url ?? getSocialImageUrl(settings) ?? OG_CARD_PATH,
        settings,
      ),
    ],
    datePublished: post.published_at || undefined,
    dateModified: post.updated_at || post.published_at || undefined,
    inLanguage: settings.locale,
    keywords: post.tags?.join(", ") || undefined,
    author: {
      "@type": "Person",
      name: post.author_name || "Tim editorial",
    },
    publisher: organizationNode(settings),
  };
}

export function profileStructuredData(
  settings: SiteSettingsRow,
  member: MemberRow,
  path = memberProfilePath(member),
): Schema {
  const url = absoluteUrl(path, settings);
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: member.name,
      description: member.bio || member.position || undefined,
      image: member.photo_url
        ? absoluteUrl(member.photo_url, settings)
        : undefined,
      url,
      affiliation: { "@id": `${getSiteUrl(settings)}/#organization` },
    },
    dateCreated: member.created_at,
    dateModified: member.updated_at,
  };
}

export function mediaStructuredData(
  settings: SiteSettingsRow,
  media: MediaRow,
): Schema | null {
  if (!media.url) return null;
  const name =
    media.title || media.caption || `Dokumentasi ${settings.site_name}`;
  const author = media.uploader_name
    ? { "@type": "Person", name: media.uploader_name }
    : organizationNode(settings);
  if (media.type === "video") {
    // Google mewajibkan thumbnailUrl untuk kelayakan Video rich result. Jangan
    // memancarkan markup setengah lengkap sebelum derivative poster tersedia.
    if (!media.thumbnail_url) return null;
    return {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      contentUrl: absoluteUrl(media.url, settings),
      thumbnailUrl: [absoluteUrl(media.thumbnail_url, settings)],
      encodingFormat: media.mime_type || undefined,
      name,
      description: media.caption || name,
      uploadDate: media.created_at,
      author,
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    contentUrl: absoluteUrl(media.url, settings),
    encodingFormat: media.mime_type || undefined,
    name,
    caption: media.caption || undefined,
    uploadDate: media.created_at,
    author,
  };
}
