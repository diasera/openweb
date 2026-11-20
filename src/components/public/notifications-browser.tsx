"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Bell, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { MotionLink, listReveal } from "@/components/motion";
import {
  FreshBadge,
  FreshnessSync,
  readNotificationLastSeen,
} from "@/components/public/notification-freshness";
import {
  getDevicePushStatus,
  type DevicePushStatus,
} from "@/components/public/use-bell-subscription";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RelativeTime } from "@/components/ui/relative-time";
import { Segmented } from "@/components/ui/segmented";
import { useHydrated, useNow } from "@/lib/hooks/use-now";
import type { NotificationRow } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { isExternalHref, normalizeNotificationHref } from "@/lib/utils/url";

type PublicNotification = Pick<
  NotificationRow,
  "id" | "title" | "body" | "url" | "created_at"
>;

type NotificationFilter = "all" | "unread";

function bucketLabel(iso: string, nowMs: number): "Hari ini" | "Minggu ini" | "Sebelumnya" {
  const diff = nowMs - Date.parse(iso);
  if (diff < 86_400_000) return "Hari ini";
  if (diff < 7 * 86_400_000) return "Minggu ini";
  return "Sebelumnya";
}

function DeviceStatusCard({
  configured,
  bellEnabled,
}: {
  configured: boolean;
  bellEnabled: boolean;
}) {
  const hydrated = useHydrated();
  const status: DevicePushStatus | "demo" = !configured
    ? "demo"
    : hydrated
      ? getDevicePushStatus()
      : "prompt";

  const meta =
    status === "demo"
      ? {
          icon: Info,
          tone: "text-muted bg-surface-2/80",
          title: "Mode Demo",
          desc: "Contoh notifikasi komunitas — lonceng push aktif saat proyek terhubung Supabase & VAPID.",
        }
      : status === "granted" && bellEnabled
        ? {
            icon: CheckCircle2,
            tone: "text-tone-green-text bg-tone-green/12",
            title: "Kanal Push Perangkat Aktif",
            desc: "Pengumuman penting langsung masuk ke notifikasi perangkat ini.",
          }
        : status === "denied"
          ? {
              icon: ShieldAlert,
              tone: "text-tone-orange-text bg-tone-orange/12",
              title: "Izin Notifikasi Browser Diblokir",
              desc: "Ubah izin notifikasi di pengaturan situs browser agar push kembali diterima.",
            }
          : status === "unconfigured" || status === "unsupported"
            ? {
                icon: Info,
                tone: "text-muted bg-surface-2/80",
                title: "Pengumuman Dalam Aplikasi",
                desc: "Kabar terbaru tetap tampil di halaman ini dan Dynamic Island.",
              }
            : {
                icon: Bell,
                tone: "text-primary-readable bg-primary/10",
                title: "Aktifkan Lonceng Perangkat",
                desc: "Nyalakan tombol lonceng di atas agar pengumuman penting tidak terlewat.",
              };

  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs",
        meta.tone,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-semibold">{meta.title}</p>
        <p className="mt-0.5 opacity-85">{meta.desc}</p>
      </div>
    </div>
  );
}

/**
 * Daftar notifikasi publik yang dikelompokkan per waktu (`Hari ini`, `Minggu ini`,
 * `Sebelumnya`), memakai `<MotionLink>` untuk rute internal agar transisi &
 * pemutar musik tidak terputus, plus filter `Semua / Baru` dan status push perangkat.
 */
export function NotificationsBrowser({
  notifications,
  configured,
  bellEnabled,
}: {
  notifications: PublicNotification[];
  configured: boolean;
  bellEnabled: boolean;
}) {
  const hydrated = useHydrated();
  const now = useNow(60_000);
  const [baselineSeen] = useState(readNotificationLastSeen);
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const unreadCount = useMemo(() => {
    if (!hydrated) return 0;
    return notifications.filter((n) => Date.parse(n.created_at) > baselineSeen).length;
  }, [baselineSeen, hydrated, notifications]);

  const visible = useMemo(() => {
    if (filter === "unread" && hydrated) {
      return notifications.filter((n) => Date.parse(n.created_at) > baselineSeen);
    }
    return notifications;
  }, [baselineSeen, filter, hydrated, notifications]);

  const groups = useMemo(() => {
    if (now === null) {
      return visible.length > 0 ? [{ label: "Terbaru", items: visible }] : [];
    }
    const map = new Map<string, PublicNotification[]>();
    for (const item of visible) {
      const key = bucketLabel(item.created_at, now);
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [now, visible]);

  return (
    <div className="space-y-4">
      <DeviceStatusCard configured={configured} bellEnabled={bellEnabled} />

      {notifications.length > 0 && unreadCount > 0 && (
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { label: `Semua (${notifications.length})`, value: "all" },
            { label: `Baru (${unreadCount})`, value: "unread" },
          ]}
        />
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title={filter === "unread" ? "Semua sudah dibaca" : "Belum ada notifikasi"}
          description={
            filter === "unread"
              ? "Tidak ada pengumuman baru yang belum terbaca."
              : "Nyalakan lonceng agar tidak ketinggalan update terbaru."
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.label} className="space-y-2.5">
              <h2 className="text-muted text-caption1 font-semibold uppercase tracking-wider">
                {group.label}
              </h2>
              <div className="space-y-2.5">
                {group.items.map((item, index) => {
                  const href = normalizeNotificationHref(item.url);
                  const external = href ? isExternalHref(href) : false;
                  const reveal = listReveal(index);

                  return (
                    <div
                      key={item.id}
                      style={reveal.style}
                      className={reveal.className}
                    >
                      <Card className="p-4">
                        <p className="flex flex-wrap items-center gap-2 font-semibold">
                          <span>{item.title}</span>
                          <FreshBadge
                            createdAt={item.created_at}
                            baselineSeen={baselineSeen}
                          />
                        </p>
                        {item.body && (
                          <p className="text-muted mt-1 text-sm leading-relaxed">
                            {item.body}
                          </p>
                        )}
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <RelativeTime
                            iso={item.created_at}
                            className="text-muted text-xs"
                          />
                          {href &&
                            (external ? (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-readable inline-flex items-center gap-1 text-sm font-medium hover:underline"
                              >
                                Buka
                                <ArrowUpRight className="size-3.5" aria-hidden="true" />
                              </a>
                            ) : (
                              <MotionLink
                                href={href}
                                className="text-primary-readable inline-flex items-center gap-1 text-sm font-medium hover:underline"
                              >
                                Buka →
                              </MotionLink>
                            ))}
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <FreshnessSync latestAt={notifications[0]?.created_at ?? null} />
    </div>
  );
}
