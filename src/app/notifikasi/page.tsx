import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { getNotifications, getSettings } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/public";
import { getBellState } from "@/lib/visitors";
import { PageShell } from "@/components/public/page-shell";
import { BellToggle } from "@/components/public/bell-toggle";
import { FreshBadge, FreshnessSync } from "@/components/public/notification-freshness";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo } from "@/lib/utils/time";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { normalizeNotificationHref } from "@/lib/utils/url";

export const dynamic = "force-dynamic"; // membaca cookie pengunjung (status lonceng)
export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), {
    ...PUBLIC_PAGE_SEO.notifikasi,
    noIndex: true,
  });
}

export default async function NotifikasiPage() {
  const notifications = await getNotifications();
  const bell = isSupabaseConfigured() ? await getBellState() : false;

  return (
    <PageShell>
      <div className="mx-auto max-w-lg">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold">Notifikasi</h1>
          <BellToggle initialEnabled={bell} />
        </div>

        {notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="h-8 w-8" />}
            title="Belum ada notifikasi"
            description="Nyalakan lonceng agar tidak ketinggalan update terbaru."
          />
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const href = normalizeNotificationHref(n.url);
              return <Card key={n.id} className="p-4">
                <p className="flex items-center gap-2 font-semibold">
                  {n.title}
                  <FreshBadge createdAt={n.created_at} />
                </p>
                {n.body && <p className="text-muted mt-1 text-sm">{n.body}</p>}
                <p className="text-muted mt-2 text-xs">{timeAgo(n.created_at)}</p>
                {href && (
                  <a
                    href={href}
                    className="text-primary-readable mt-1 inline-block text-sm font-medium"
                  >
                    Buka →
                  </a>
                )}
              </Card>;
            })}
          </div>
        )}
        <FreshnessSync latestAt={notifications[0]?.created_at ?? null} />
      </div>
    </PageShell>
  );
}
