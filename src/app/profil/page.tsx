import type { Metadata } from "next";
import { headers } from "next/headers";
import { Lock } from "lucide-react";
import {
  getSettings,
  getMemberCount,
  getApprovedMediaCount,
  getPublishedPostCount,
} from "@/lib/data";
import { allowedFeatures, getCurrentAdmin } from "@/lib/auth";
import { getAdminStats } from "@/lib/admin/stats";
import { ADMIN_AUTH_PATHS } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/public";
import { getClientIp } from "@/lib/utils/request";
import { getBellState } from "@/lib/visitors";
import { PageShell } from "@/components/public/page-shell";
import {
  DESTINATION_ICONS,
  type Destination,
} from "@/components/public/destination-icons";
import { SiteIdentityCard } from "@/components/public/site-identity-card";
import { ProfilNotificationToggle } from "@/components/public/profil-notification-toggle";
import { ProfilMusicToggle } from "@/components/public/music";
import { AdminHome } from "@/components/admin/admin-home";
import { StatsRow } from "@/components/ui/stats-row";
import { MenuGroup, MenuRow } from "@/components/ui/menu-row";
import { IconPlate } from "@/components/ui/icon-plate";
import { MotionLink } from "@/components/motion";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { getContentLabels, toDisplayLabel } from "@/lib/site-config";

export const dynamic = "force-dynamic"; // membaca cookie (status lonceng)

/** Kelas tone ditulis literal agar terbaca pemindai Tailwind. */
const PROFILE_MENU: ReadonlyArray<{
  href: Destination;
  label: string;
  tone: string;
}> = [
  { href: "/galeri", label: "Galeri", tone: "bg-tone-blue text-white" },
  { href: "/album", label: "Album", tone: "bg-tone-indigo text-white" },
  { href: "/agenda", label: "Agenda", tone: "bg-tone-orange text-white" },
  { href: "/tersimpan", label: "Tersimpan", tone: "bg-tone-pink text-white" },
  { href: "/blog", label: "Blog", tone: "bg-tone-teal text-white" },
  { href: "/pesan", label: "Pesan Anonim", tone: "bg-tone-purple text-white" },
  { href: "/anggota", label: "Anggota", tone: "bg-tone-green text-white" },
  { href: "/tentang", label: "Tentang", tone: "bg-tone-cyan text-white" },
  { href: "/privasi", label: "Kebijakan Privasi", tone: "bg-tone-gray text-white" },
];

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), PUBLIC_PAGE_SEO.profil);
}

export default async function ProfilPage() {
  const settingsPromise = getSettings();
  const admin = await getCurrentAdmin();

  if (admin) {
    const [settings, stats, requestHeaders] = await Promise.all([
      settingsPromise,
      getAdminStats(),
      headers(),
    ]);

    return (
      <AdminHome
        siteName={settings.site_name}
        admin={admin}
        features={allowedFeatures(admin)}
        stats={stats}
        clientIpDetected={getClientIp(requestHeaders) !== null}
      />
    );
  }

  const [settings, memberCount, mediaCount, postCount, bell] = await Promise.all([
    settingsPromise,
    getMemberCount(),
    getApprovedMediaCount(),
    getPublishedPostCount(),
    isSupabaseConfigured() ? getBellState() : Promise.resolve(false),
  ]);
  const labels = getContentLabels(settings);
  const memberLabel = toDisplayLabel(labels.memberPlural, settings.locale);
  const subtitle = settings.tagline || settings.description || "";

  return (
    <PageShell
      header={{ variant: "title", title: "Profil" }}
    >
      <div className="space-y-4">
        <SiteIdentityCard name={settings.site_name} logoUrl={settings.logo_url}>
          {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
          <div className="mt-4">
            <StatsRow
              items={[
                { value: memberCount, label: memberLabel },
                { value: mediaCount, label: "Pin" },
                { value: postCount, label: "Artikel" },
              ]}
            />
          </div>
        </SiteIdentityCard>

        <MenuGroup>
          {PROFILE_MENU.map((item) => (
            <MenuRow
              key={item.href}
              href={item.href}
              icon={
                <IconPlate
                  icon={DESTINATION_ICONS[item.href]}
                  className={item.tone}
                  size="sm"
                />
              }
              // Istilah anggota mengikuti Pengaturan.
              label={item.href === "/anggota" ? memberLabel : item.label}
            />
          ))}
        </MenuGroup>

        <ProfilNotificationToggle initialBell={bell} />
        <ProfilMusicToggle />

        <MotionLink
          href={ADMIN_AUTH_PATHS.login}
          className="motion-pressable bg-foreground text-bg rounded-ios flex items-center justify-center gap-2 py-3.5 font-semibold hover:opacity-90"
        >
          <Lock className="h-4 w-4" /> Masuk sebagai Admin
        </MotionLink>

        {settings.footer_text && (
          <p className="text-muted text-center text-xs">{settings.footer_text}</p>
        )}
      </div>
    </PageShell>
  );
}
