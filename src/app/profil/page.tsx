import type { Metadata } from "next";
import {
  LayoutGrid,
  Newspaper,
  MessageSquare,
  Users,
  Info,
  Lock,
  ShieldCheck,
} from "lucide-react";
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
import { getBellState } from "@/lib/visitors";
import { PageShell } from "@/components/public/page-shell";
import { SiteLogo } from "@/components/public/site-logo";
import { ProfilNotificationToggle } from "@/components/public/profil-notification-toggle";
import { ProfilMusicToggle } from "@/components/public/music";
import { AdminHome } from "@/components/admin/admin-home";
import { Card } from "@/components/ui/card";
import { StatsRow } from "@/components/ui/stats-row";
import { MenuGroup, MenuRow } from "@/components/ui/menu-row";
import { MotionLink } from "@/components/motion";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { getContentLabels, toDisplayLabel } from "@/lib/site-config";

export const dynamic = "force-dynamic"; // membaca cookie (status lonceng)
export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), PUBLIC_PAGE_SEO.profil);
}

export default async function ProfilPage() {
  const settingsPromise = getSettings();
  const admin = await getCurrentAdmin();

  if (admin) {
    const [settings, stats] = await Promise.all([
      settingsPromise,
      getAdminStats(),
    ]);

    return (
      <AdminHome
        siteName={settings.site_name}
        admin={admin}
        features={allowedFeatures(admin)}
        stats={stats}
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
        <Card className="p-5 text-center">
          <div className="flex justify-center">
            <SiteLogo name={settings.site_name} url={settings.logo_url} size={72} />
          </div>
          <h1 className="font-display mt-3 text-xl font-bold">
            {settings.site_name}
          </h1>
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
        </Card>

        <MenuGroup>
          <MenuRow href="/galeri" icon={<LayoutGrid className="h-[18px] w-[18px]" />} label="Galeri" />
          <MenuRow href="/blog" icon={<Newspaper className="h-[18px] w-[18px]" />} label="Blog" />
          <MenuRow href="/pesan" icon={<MessageSquare className="h-[18px] w-[18px]" />} label="Pesan Anonim" />
          <MenuRow href="/anggota" icon={<Users className="h-[18px] w-[18px]" />} label={memberLabel} />
          <MenuRow href="/tentang" icon={<Info className="h-[18px] w-[18px]" />} label="Tentang" />
          <MenuRow href="/privasi" icon={<ShieldCheck className="h-[18px] w-[18px]" />} label="Kebijakan Privasi" />
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
