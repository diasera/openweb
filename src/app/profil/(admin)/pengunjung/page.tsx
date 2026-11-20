import { Bell, BellRing, Eye, Smartphone } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import {
  getBannedIpCount,
  getBellCount,
  getPushDeviceCount,
  getQuickNotificationTargets,
  getSentNotifications,
  getTotalVisitorCount,
  getVisitors,
  parseVisitorFilter,
} from "@/lib/admin/visitors";
import { getVapidConfig } from "@/lib/push/vapid";
import { adminFeatureHref } from "@/lib/constants";
import { buildAdminPageMetadata } from "@/lib/seo";
import { deviceLabel } from "@/lib/utils/request";
import { parsePageParam } from "@/lib/utils/url";
import { cn } from "@/lib/utils/cn";
import { cardClass } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RelativeTime } from "@/components/ui/relative-time";
import { SectionHeader } from "@/components/ui/section-header";
import { Pagination } from "@/components/public/pagination";
import { listReveal } from "@/components/motion";
import { AdminPage } from "@/components/admin/admin-page";
import {
  AdminList,
  AdminRow,
  LeadingIcon,
  StatusBadge,
} from "@/components/admin/admin-list";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { BanIpAction, DeleteAction } from "@/components/admin/admin-actions";
import { ADMIN_FEATURE_PRESENTATION } from "@/components/admin/features";
import { StatTile } from "@/components/admin/stat-tile";
import {
  NotificationComposer,
  ReuseNotificationButton,
} from "@/components/admin/visitors/notification-composer";
import {
  deleteNotification,
  deleteVisitor,
  setVisitorIpBlocked,
} from "./actions";

export const metadata = buildAdminPageMetadata("Pengunjung");

export default async function PengunjungPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  await requireFeature("pengunjung");
  const { page, filter: rawFilter } = await searchParams;
  const filter = parseVisitorFilter(rawFilter);

  const [
    visitorPage,
    totalVisitors,
    bellCount,
    bannedCount,
    pushCount,
    notifications,
    quickTargets,
  ] = await Promise.all([
    getVisitors(parsePageParam(page), filter),
    getTotalVisitorCount(),
    getBellCount(),
    getBannedIpCount(),
    getPushDeviceCount(),
    getSentNotifications(),
    getQuickNotificationTargets(),
  ]);

  const vapidReady = Boolean(getVapidConfig());
  const plate = ADMIN_FEATURE_PRESENTATION.pengunjung.plate;
  const tiles = [
    {
      label: "Total pengunjung",
      value: totalVisitors,
      icon: Eye,
      hint: "Perangkat unik tercatat",
    },
    {
      label: "Langganan lonceng",
      value: bellCount,
      icon: Bell,
      hint: "Melihat notifikasi in-app",
    },
    {
      label: "Perangkat push",
      value: pushCount,
      icon: Smartphone,
      hint: vapidReady ? "Kanal VAPID aktif" : "VAPID belum disetel",
    },
  ];

  const basePath = adminFeatureHref("pengunjung");

  return (
    <AdminPage
      feature="pengunjung"
      title="Pengunjung"
      description="Pantau audiens, kirim notifikasi, dan batasi interaksi IP. IP yang diblokir tetap bisa membuka website."
    >
      <div className="space-y-9">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {tiles.map((tile, index) => {
            const reveal = listReveal(index);
            return (
              <div
                key={tile.label}
                style={reveal.style}
                className={cn(
                  reveal.className,
                  index === 0 && "col-span-2 lg:col-span-1",
                )}
              >
                <StatTile {...tile} plate={plate} className="h-full" />
              </div>
            );
          })}
        </div>

        <section
          id="kirim-notifikasi"
          aria-labelledby="notify-title"
          className={cardClass(
            "elevated",
            "aurora relative scroll-mt-28 overflow-hidden p-5 sm:p-6",
          )}
        >
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 id="notify-title" className="font-display text-lg font-bold">
              Kirim notifikasi
            </h2>
            <StatusBadge
              tone={vapidReady ? "success" : "neutral"}
              live={vapidReady}
            >
              {vapidReady ? "Web Push VAPID aktif" : "Mode in-app saja"}
            </StatusBadge>
          </div>
          <p className="text-muted mb-5 text-sm">
            Terlihat oleh {bellCount} pengunjung yang menyalakan lonceng (serta
            tampil di Dynamic Island)
            {vapidReady && pushCount > 0
              ? ` dan terkirim langsung ke ${pushCount} perangkat push.`
              : "."}
          </p>
          <NotificationComposer
            quickTargets={quickTargets}
            bellCount={bellCount}
            pushCount={pushCount}
            vapidReady={vapidReady}
          />
        </section>

        {notifications.length > 0 && (
          <section aria-labelledby="sent-title">
            <SectionHeader
              id="sent-title"
              title="Notifikasi terkirim"
              count={notifications.length}
            />
            <AdminList label="Notifikasi terkirim">
              {notifications.map((notification, index) => (
                <AdminRow
                  key={notification.id}
                  index={index}
                  leading={
                    <LeadingIcon
                      icon={BellRing}
                      className="bg-tone-cyan/12 text-tone-cyan-text"
                    />
                  }
                  title={notification.title}
                  meta={
                    <>
                      <RelativeTime iso={notification.created_at} />
                      {notification.url && ` · ${notification.url}`}
                    </>
                  }
                  actions={
                    <>
                      <ReuseNotificationButton
                        title={notification.title}
                        body={notification.body}
                        url={notification.url}
                      />
                      <DeleteAction
                        action={deleteNotification}
                        id={notification.id}
                        title="Hapus notifikasi ini?"
                        message="Notifikasi hilang dari daftar pengunjung; push yang sudah terkirim tidak bisa ditarik."
                        successMessage="Notifikasi dihapus"
                      />
                    </>
                  }
                >
                  {notification.body && (
                    <p className="text-muted line-clamp-2 text-sm">
                      {notification.body}
                    </p>
                  )}
                </AdminRow>
              ))}
            </AdminList>
          </section>
        )}

        <section aria-labelledby="visitors-title" className="space-y-4">
          <SectionHeader
            id="visitors-title"
            title="Daftar pengunjung"
            count={visitorPage.total}
          />

          <AdminTabs
            basePath={basePath}
            param="filter"
            active={filter}
            label="Filter pengunjung"
            items={[
              { label: "Semua", value: "all", count: totalVisitors },
              { label: "Lonceng aktif", value: "bell", count: bellCount },
              {
                label: "Diblokir",
                value: "banned",
                count: bannedCount,
                alert: bannedCount > 0,
              },
            ]}
          />

          {visitorPage.rows.length === 0 ? (
            <EmptyState
              icon={<Eye className="size-8" />}
              title={
                filter === "all"
                  ? "Belum ada pengunjung terekam"
                  : "Tidak ada pengunjung di filter ini"
              }
              description={
                filter === "all"
                  ? "Data pengunjung muncul otomatis saat website diakses."
                  : "Ubah tab filter untuk melihat daftar pengunjung lainnya."
              }
            />
          ) : (
            <AdminList label="Pengunjung">
              {visitorPage.rows.map((visitor, index) => (
                <AdminRow
                  key={visitor.id}
                  index={index}
                  leading={<LeadingIcon icon={Smartphone} />}
                  title={
                    <span className="font-mono">
                      {visitor.ip_address ?? "IP tidak tersedia"}
                    </span>
                  }
                  badges={
                    <>
                      {visitor.notifications_enabled && (
                        <StatusBadge tone="primary">Lonceng</StatusBadge>
                      )}
                      {visitor.is_banned && (
                        <StatusBadge tone="danger">Diblokir</StatusBadge>
                      )}
                    </>
                  }
                  meta={
                    <>
                      {deviceLabel(visitor.device)} · {visitor.visit_count}×
                      kunjungan · terakhir{" "}
                      <RelativeTime iso={visitor.last_seen_at} />
                    </>
                  }
                  actions={
                    <>
                      {visitor.ip_address && (
                        <BanIpAction
                          action={setVisitorIpBlocked.bind(
                            null,
                            !visitor.is_banned,
                          )}
                          id={visitor.id}
                          blocked={visitor.is_banned}
                        />
                      )}
                      <DeleteAction
                        action={deleteVisitor}
                        id={visitor.id}
                        title="Hapus data pengunjung ini?"
                        message="Langganan push perangkat ini ikut dihapus."
                        successMessage="Data pengunjung dihapus"
                      />
                    </>
                  }
                />
              ))}
            </AdminList>
          )}
          <Pagination
            basePath={basePath}
            current={visitorPage.page}
            total={visitorPage.totalPages}
            query={filter === "all" ? {} : { filter }}
          />
        </section>
      </div>
    </AdminPage>
  );
}
