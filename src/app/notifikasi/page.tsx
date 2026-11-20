import type { Metadata } from "next";
import { getNotifications, getSettings } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/public";
import { getBellState } from "@/lib/visitors";
import { PageShell } from "@/components/public/page-shell";
import { BellToggle } from "@/components/public/bell-toggle";
import { NotificationsBrowser } from "@/components/public/notifications-browser";
import { PageHeader } from "@/components/ui/page-header";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";

export const dynamic = "force-dynamic"; // membaca cookie pengunjung (status lonceng)
export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), {
    ...PUBLIC_PAGE_SEO.notifikasi,
    noIndex: true,
  });
}

export default async function NotifikasiPage() {
  const configured = isSupabaseConfigured();
  const notifications = await getNotifications();
  const bell = configured ? await getBellState() : false;

  return (
    <PageShell>
      <div className="mx-auto max-w-lg">
        <PageHeader
          size="large"
          title="Notifikasi"
          action={configured ? <BellToggle initialEnabled={bell} /> : undefined}
        />

        <NotificationsBrowser
          notifications={notifications}
          configured={configured}
          bellEnabled={bell}
        />
      </div>
    </PageShell>
  );
}
