import type { SiteSettingsRow } from "@/lib/types/database";

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function vercelOrigin(value: string | undefined): string | null {
  if (!value) return null;
  return normalizeOrigin(value.startsWith("http") ? value : `https://${value}`);
}

/** Canonical origin tunggal untuk metadata, sitemap, robots, manifest, dan UI. */
export function getSiteOrigin(
  settings?: Pick<SiteSettingsRow, "site_url">,
): string {
  return (
    normalizeOrigin(settings?.site_url) ??
    normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
    vercelOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    vercelOrigin(process.env.VERCEL_URL) ??
    "http://localhost:3000"
  );
}

export function toAbsoluteSiteUrl(
  path: string,
  settings?: Pick<SiteSettingsRow, "site_url">,
): string {
  return new URL(path, `${getSiteOrigin(settings)}/`).toString();
}

