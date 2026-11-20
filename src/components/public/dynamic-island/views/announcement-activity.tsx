"use client";

import { useCallback, useSyncExternalStore, type ReactNode } from "react";
import { Check, Megaphone } from "lucide-react";
import { MotionLink } from "@/components/motion";
import { RelativeTime } from "@/components/ui/relative-time";
import {
  markNotificationSeen,
  NOTIFICATION_SEEN_EVENT,
  readNotificationLastSeen,
} from "@/components/public/notification-freshness";
import { STORAGE_KEYS } from "@/lib/utils/storage";
import { isExternalHref, normalizeNotificationHref } from "@/lib/utils/url";
import type { IslandAnnouncement } from "../dynamic-island.types";
import styles from "../dynamic-island.module.css";

function subscribeSeen(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === STORAGE_KEYS.notificationLastSeen) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(NOTIFICATION_SEEN_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(NOTIFICATION_SEEN_EVENT, onStoreChange);
  };
}

/**
 * Status baca pengumuman terbaru yang sinkron lintas Dynamic Island,
 * halaman `/notifikasi`, dan tab browser lain — aman hidrasi SSR.
 */
export function useUnreadAnnouncement(announcement: IslandAnnouncement | null) {
  const lastSeen = useSyncExternalStore(
    subscribeSeen,
    readNotificationLastSeen,
    () => Number.POSITIVE_INFINITY,
  );

  const unread = Boolean(
    announcement && Date.parse(announcement.created_at) > lastSeen,
  );

  const markRead = useCallback(() => {
    if (!announcement) return;
    markNotificationSeen(announcement.created_at);
  }, [announcement]);

  return { unread, markRead };
}

/**
 * Live Activity pengumuman di kapsul Dynamic Island: tampil ketika ada siaran
 * terbaru (≤ 72 jam) yang belum dibaca pengunjung.
 */
export function IslandAnnouncementChip({
  announcement,
  onExpand,
  fallback = null,
}: {
  announcement: IslandAnnouncement | null;
  onExpand: () => void;
  fallback?: ReactNode;
}) {
  const { unread } = useUnreadAnnouncement(announcement);
  if (!announcement || !unread) return fallback;

  return (
    <button
      type="button"
      onClick={onExpand}
      aria-haspopup="dialog"
      aria-label={`Pengumuman baru: ${announcement.title}. Buka panel cepat`}
      title={announcement.title}
      className={styles.announcementChip}
    >
      <span className={styles.eventChipDot} aria-hidden="true" />
      <Megaphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="max-w-[7.5rem] truncate sm:max-w-[11rem]">
        Info baru
      </span>
    </button>
  );
}

/** Kartu siaran pengumuman di dalam quick panel Dynamic Island. */
export function IslandAnnouncementCard({
  announcement,
  onNavigate,
}: {
  announcement: IslandAnnouncement;
  onNavigate: () => void;
}) {
  const { unread, markRead } = useUnreadAnnouncement(announcement);
  if (!unread) return null;

  const href = normalizeNotificationHref(announcement.url);
  const external = href ? isExternalHref(href) : false;

  return (
    <div className={styles.panelAnnouncement}>
      <span className={styles.panelAnnouncementIcon} aria-hidden="true">
        <Megaphone className="size-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-primary-readable flex items-center gap-1.5 text-caption2 font-bold uppercase tracking-wide">
          <span>Pengumuman</span>
          <span aria-hidden="true">·</span>
          <RelativeTime
            iso={announcement.created_at}
            className="font-semibold normal-case tracking-normal"
          />
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold">
          {announcement.title}
        </p>
        {announcement.body && (
          <p className="text-muted mt-0.5 line-clamp-1 text-xs">
            {announcement.body}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          {href ? (
            external ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  markRead();
                  onNavigate();
                }}
                className="text-primary-readable text-xs font-semibold hover:underline"
              >
                Buka tautan →
              </a>
            ) : (
              <MotionLink
                href={href}
                onClick={() => {
                  markRead();
                  onNavigate();
                }}
                className="text-primary-readable text-xs font-semibold hover:underline"
              >
                Lihat detail →
              </MotionLink>
            )
          ) : (
            <MotionLink
              href="/notifikasi"
              onClick={() => {
                markRead();
                onNavigate();
              }}
              className="text-primary-readable text-xs font-semibold hover:underline"
            >
              Buka notifikasi →
            </MotionLink>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={markRead}
        aria-label="Tandai pengumuman sudah dibaca"
        title="Tandai dibaca"
        className="motion-pressable text-muted hover:bg-surface hover:text-foreground grid size-7 shrink-0 place-items-center rounded-full transition-colors"
      >
        <Check className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
