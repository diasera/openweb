import { Eye, Bell, Smartphone } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import { buildAdminPageMetadata } from "@/lib/seo";
import {
  getVisitors,
  getBellCount,
  getPushDeviceCount,
  getSentNotifications,
} from "@/lib/admin/visitors";
import { deviceLabel } from "@/lib/utils/request";
import { timeAgo } from "@/lib/utils/time";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  BanIpButton,
  DeleteButton,
} from "@/components/admin/confirmed-action-button";
import { NotificationComposer } from "@/components/admin/notification-composer";
import {
  deleteVisitor,
  deleteNotification,
  setVisitorIpBlocked,
} from "./actions";

export const metadata = buildAdminPageMetadata("Pengunjung");

export default async function PengunjungPage() {
  await requireFeature("pengunjung");
  const [visitors, bellCount, pushCount, notifications] = await Promise.all([
    getVisitors(),
    getBellCount(),
    getPushDeviceCount(),
    getSentNotifications(),
  ]);

  return (
    <div>
      <PageHeader
        title="Pengunjung"
        description="Pantau audiens, kirim notifikasi, dan batasi interaksi IP. IP yang diblokir tetap dapat membuka website."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total pengunjung"
          value={visitors.length}
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          label="Langganan lonceng"
          value={bellCount}
          icon={<Bell className="h-5 w-5" />}
        />
        <StatCard
          label="Perangkat push"
          value={pushCount}
          icon={<Smartphone className="h-5 w-5" />}
        />
      </div>

      <Card className="mb-6 p-5">
        <h2 className="font-display text-lg font-bold">Kirim Notifikasi</h2>
        <p className="text-muted mb-4 mt-0.5 text-sm">
          Terlihat oleh {bellCount} pengunjung yang menyalakan lonceng
          {pushCount > 0
            ? ` dan terkirim langsung ke ${pushCount} perangkat.`
            : "."}
        </p>
        <NotificationComposer />
      </Card>

      {notifications.length > 0 && (
        <div className="mb-6">
          <h2 className="font-display mb-3 text-lg font-bold">Notifikasi Terkirim</h2>
          <div className="space-y-2">
            {notifications.map((n) => (
              <Card
                key={n.id}
                className="flex items-center justify-between gap-3 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <p className="text-muted truncate text-xs">
                    {timeAgo(n.created_at)}
                  </p>
                </div>
                <DeleteButton
                  action={deleteNotification}
                  id={n.id}
                  message="Hapus notifikasi ini?"
                />
              </Card>
            ))}
          </div>
        </div>
      )}

      <h2 className="font-display mb-3 text-lg font-bold">Daftar Pengunjung</h2>
      {visitors.length === 0 ? (
        <EmptyState
          icon={<Eye className="h-8 w-8" />}
          title="Belum ada pengunjung terekam"
          description="Data pengunjung muncul otomatis saat website diakses."
        />
      ) : (
        <div className="space-y-2">
          {visitors.map((v) => (
            <Card
              key={v.id}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  <span className="font-mono">{v.ip_address ?? "—"}</span>
                  {v.notifications_enabled && (
                    <Bell className="text-primary-readable h-3.5 w-3.5" />
                  )}
                  {v.is_banned && (
                    <span className="bg-danger/10 text-danger rounded-full px-2 py-0.5 text-[10px] font-semibold">
                      Diblokir
                    </span>
                  )}
                </p>
                <p className="text-muted truncate text-xs">
                  {deviceLabel(v.device)} · {v.visit_count}× · {timeAgo(v.last_seen_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {v.ip_address && (
                  <BanIpButton
                    action={setVisitorIpBlocked.bind(null, !v.is_banned)}
                    id={v.id}
                    blocked={v.is_banned}
                    message={
                      v.is_banned
                        ? "Buka blokir IP ini agar dapat berinteraksi lagi?"
                        : "Blokir IP ini dari komentar, upload, dan pesan anonim?"
                    }
                  />
                )}
                <DeleteButton
                  action={deleteVisitor}
                  id={v.id}
                  message="Hapus data pengunjung ini?"
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
