import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  getApprovedMediaCount,
  getMemberCount,
  getPublishedPostCount,
  getSettings,
} from "@/lib/data";
import { allowedFeatures, getCurrentAdmin } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/admin/dashboard";
import { isSupabaseConfigured } from "@/lib/supabase/public";
import { getClientIp } from "@/lib/utils/request";
import { getBellState } from "@/lib/visitors";
import { buildPageMetadata, normalizeVerificationCode, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { getContentLabels, getSiteOrigin, toDisplayLabel } from "@/lib/site-config";
import { AdminDashboard } from "@/components/admin/dashboard/admin-dashboard";
import { ProfilHub } from "@/components/public/profil/profil-hub";

export const dynamic = "force-dynamic"; // membaca cookie (sesi admin & lonceng)

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), PUBLIC_PAGE_SEO.profil);
}

/** Tab Profil: dasbor bila admin masuk, hub jelajah bila pengunjung. */
export default async function ProfilPage() {
  const settingsPromise = getSettings();
  const admin = await getCurrentAdmin();

  if (admin) {
    const features = allowedFeatures(admin);
    const [settings, data, requestHeaders] = await Promise.all([
      settingsPromise,
      getAdminDashboard(features),
      headers(),
    ]);
    return (
      <AdminDashboard
        siteName={settings.site_name}
        admin={admin}
        features={features}
        data={data}
        clientIpDetected={getClientIp(requestHeaders) !== null}
        seo={
          features.includes("setting")
            ? {
                indexing: settings.seo_indexing_enabled,
                siteUrl: getSiteOrigin(settings),
                verified: Boolean(normalizeVerificationCode(settings.google_site_verification)),
              }
            : null
        }
      />
    );
  }

  const [settings, members, media, posts, bell] = await Promise.all([
    settingsPromise,
    getMemberCount(),
    getApprovedMediaCount(),
    getPublishedPostCount(),
    isSupabaseConfigured() ? getBellState() : Promise.resolve(false),
  ]);
  const labels = getContentLabels(settings);

  return (
    <ProfilHub
      siteName={settings.site_name}
      logoUrl={settings.logo_url}
      tagline={settings.tagline}
      description={settings.description}
      footerText={settings.footer_text}
      memberLabel={toDisplayLabel(labels.memberPlural, settings.locale)}
      stats={{ members, media, posts }}
      initialBell={bell}
    />
  );
}
