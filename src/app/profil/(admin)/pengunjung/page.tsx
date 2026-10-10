import { Bell, BellRing, Eye, Smartphone } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import {
  getBellCount,
  getPushDeviceCount,
  getSentNotifications,
  getVisitors,
} from "@/lib/admin/visitors";
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
import { AdminList, AdminRow, LeadingIcon, StatusBadge } from "@/components/admin/admin-list";
import { BanIpAction, DeleteAction } from "@/components/admin/admin-actions";
import { ADMIN_FEATURE_PRESENTATION } from "@/components/admin/features";
import { StatTile } from "@/components/admin/stat-tile";
import { NotificationComposer } from "@/components/admin/visitors/notification-composer";
import { deleteNotification, deleteVisitor, setVisitorIpBlocked } from "./actions";

export const metadata = buildAdminPageMetadata("Pengunjung");

export default async function PengunjungPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireFeature("pengunjung");
  const { page } = await searchParams;
  const [visitorPage, bellCount, pushCount, notifications] = await Promise.all([
    getVisitors(parsePageParam(page)),
    getBellCount(),
    getPushDeviceCount(),
    getSentNotifications(),
  ]);
  const plate = ADMIN_FEATURE_PRESENTATION.pengunjung.plate;
  const tiles = [
    { label: "Total pengunjung", value: visitorPage.total, icon: Eye, hint: "Perangkat unik tercatat" },
    { label: "Langganan lonceng", value: bellCount, icon: Bell, hint: "Melihat notifikasi in-app" },
    { label: "Perangkat push", value: pushCount, icon: Smartphone, hint: "Menerima push langsung" },
  ];

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
                className={cn(reveal.className, index === 0 && "col-span-2 lg:col-span-1")}
              >
                <StatTile {...tile} plate={plate} className="h-full" />
              </div>
            );
          })}
        </div>

        <section
          id="kirim-notifikasi"
          aria-labelledby="notify-title"
          className={cardClass("elevated", "aurora relative scroll-mt-28 overflow-hidden p-5 sm:p-6")}
        >
          <h2 id="notify-title" className="font-display text-lg font-bold">
            Kirim notifikasi
          </h2>
          <p className="text-muted mb-5 mt-0.5 text-sm">
            Terlihat oleh {bellCount} pengunjung yang menyalakan lonceng
            {pushCount > 0 ? ` dan terkirim langsung ke ${pushCount} perangkat.` : "."}
          </p>
          <NotificationComposer />
        </section>

        {notifications.length > 0 && (
          <section aria-labelledby="sent-title">
            <SectionHeader id="sent-title" title="Notifikasi terkirim" count={notifications.length} />
            <AdminList label="Notifikasi terkirim">
              {notifications.map((notification, index) => (
                <AdminRow
                  key={notification.id}
                  index={index}
                  leading={<LeadingIcon icon={BellRing} className="bg-tone-cyan/12 text-tone-cyan-text" />}
                  title={notification.title}
                  meta={
                    <>
                      <RelativeTime iso={notification.created_at} />
                      {notification.url && ` · ${notification.url}`}
                    </>
                  }
                  actions={
                    <DeleteAction
                      action={deleteNotification}
                      id={notification.id}
                      title="Hapus notifikasi ini?"
                      message="Notifikasi hilang dari daftar pengunjung; push yang sudah terkirim tidak bisa ditarik."
                      successMessage="Notifikasi dihapus"
                    />
                  }
                >
                  {notification.body && (
                    <p className="text-muted line-clamp-2 text-sm">{notification.body}</p>
                  )}
                </AdminRow>
              ))}
            </AdminList>
          </section>
        )}

        <section aria-labelledby="visitors-title">
          <SectionHeader id="visitors-title" title="Daftar pengunjung" count={visitorPage.total} />
          {visitorPage.rows.length === 0 ? (
            <EmptyState
              icon={<Eye className="size-8" />}
              title="Belum ada pengunjung terekam"
              description="Data pengunjung muncul otomatis saat website diakses."
            />
          ) : (
            <AdminList label="Pengunjung">
              {visitorPage.rows.map((visitor, index) => (
                <AdminRow
                  key={visitor.id}
                  index={index}
                  leading={<LeadingIcon icon={Smartphone} />}
                  title={<span className="font-mono">{visitor.ip_address ?? "IP tidak tersedia"}</span>}
                  badges={
                    <>
                      {visitor.notifications_enabled && <StatusBadge tone="primary">Lonceng</StatusBadge>}
                      {visitor.is_banned && <StatusBadge tone="danger">Diblokir</StatusBadge>}
                    </>
                  }
                  meta={
                    <>
                      {deviceLabel(visitor.device)} · {visitor.visit_count}× kunjungan · terakhir{" "}
                      <RelativeTime iso={visitor.last_seen_at} />
                    </>
                  }
                  actions={
                    <>
                      {visitor.ip_address && (
                        <BanIpAction
                          action={setVisitorIpBlocked.bind(null, !visitor.is_banned)}
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
            basePath={adminFeatureHref("pengunjung")}
            current={visitorPage.page}
            total={visitorPage.totalPages}
          />
        </section>
      </div>
    </AdminPage>
  );
}
