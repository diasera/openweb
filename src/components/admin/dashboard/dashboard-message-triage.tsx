"use client";

import { useRouter } from "next/navigation";
import { Check, CheckCheck, Music2, Pin, PinOff } from "lucide-react";
import {
  markAllMessagesRead,
  setMessageRead,
  togglePinMessage,
} from "@/app/profil/(admin)/pesan/actions";
import { MotionLink, listReveal } from "@/components/motion";
import { cardClass } from "@/components/ui/card";
import { RelativeTime } from "@/components/ui/relative-time";
import { SectionHeader } from "@/components/ui/section-header";
import { adminFeatureHref } from "@/lib/constants";
import type { DashboardMessage } from "@/lib/admin/dashboard";
import { parseSongfessContent } from "@/lib/messages/songfess";
import { cn } from "@/lib/utils/cn";
import { useAdminAction } from "../use-admin-action";

/**
 * Panel triase cepat pesan anonim terbaru di Dasbor Admin: tandai dibaca,
 * sematkan ke beranda, atau tandai semua dibaca dalam satu ketuk tanpa keluar
 * dari dasbor. Selalu memakai Server Action terproteksi `requireFeature("pesan")`.
 */
export function DashboardMessageTriage({
  messages,
  unreadCount,
}: {
  messages: DashboardMessage[];
  unreadCount: number;
}) {
  const router = useRouter();
  const { pending, run } = useAdminAction();

  return (
    <section aria-labelledby="admin-messages">
      <SectionHeader
        id="admin-messages"
        eyebrow="Kotak masuk"
        title="Pesan terbaru"
        action={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(() => markAllMessagesRead(), {
                    successMessage: "Semua pesan ditandai dibaca",
                    errorMessage: "Gagal menandai semua pesan.",
                    onSuccess: () => router.refresh(),
                  })
                }
                className="text-muted hover:text-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-45"
              >
                <CheckCheck className="size-3.5" aria-hidden="true" />
                Baca semua
              </button>
            )}
            <MotionLink
              href={adminFeatureHref("pesan")}
              className="text-primary-readable text-xs font-semibold hover:underline"
            >
              Semua
            </MotionLink>
          </div>
        }
      />

      <ul className="space-y-2">
        {messages.map((message, index) => {
          const parsed = parseSongfessContent(message.content);
          return (
            <li key={message.id} {...listReveal(index)}>
              <div
                className={cardClass(
                  "elevated",
                  cn(
                    "flex items-start gap-3 p-3.5",
                    !message.is_read && "border-primary/35",
                  ),
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    message.is_read ? "bg-border" : "bg-primary",
                  )}
                />

                <MotionLink
                  href={adminFeatureHref("pesan")}
                  className="min-w-0 flex-1"
                >
                  <p className="line-clamp-2 text-sm leading-relaxed">
                    {parsed.text || "Kiriman Songfess"}
                  </p>
                  <p className="text-muted mt-1 flex flex-wrap items-center gap-x-1.5 text-caption1">
                    {!message.is_read && (
                      <span className="text-primary-readable font-semibold">
                        Baru ·
                      </span>
                    )}
                    {message.is_pinned && (
                      <span className="text-tone-indigo-text font-semibold">
                        Disematkan ·
                      </span>
                    )}
                    {parsed.trackId && (
                      <span className="inline-flex items-center gap-0.5 font-medium">
                        <Music2 className="size-3" aria-hidden="true" />
                        Songfess ·
                      </span>
                    )}
                    <RelativeTime iso={message.created_at} />
                  </p>
                </MotionLink>

                <div className="flex shrink-0 items-center gap-1">
                  {!message.is_read && (
                    <button
                      type="button"
                      disabled={pending}
                      aria-label="Tandai pesan sudah dibaca"
                      title="Tandai dibaca"
                      onClick={() =>
                        run(() => setMessageRead(message.id, true), {
                          successMessage: "Ditandai dibaca",
                          errorMessage: "Gagal memperbarui status baca.",
                          onSuccess: () => router.refresh(),
                        })
                      }
                      className="motion-pressable text-muted hover:bg-surface-2 hover:text-foreground grid size-8 place-items-center rounded-xl transition-colors disabled:opacity-40"
                    >
                      <Check className="size-4" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={
                      message.is_pinned
                        ? "Lepas sematan pesan"
                        : "Sematkan ke beranda"
                    }
                    title={message.is_pinned ? "Lepas pin" : "Pin ke beranda"}
                    onClick={() =>
                      run(
                        () => togglePinMessage(message.id, !message.is_pinned),
                        {
                          successMessage: message.is_pinned
                            ? "Sematan dilepas"
                            : "Pesan disematkan ke beranda",
                          errorMessage: "Gagal mengubah sematan.",
                          onSuccess: () => router.refresh(),
                        },
                      )
                    }
                    className={cn(
                      "motion-pressable grid size-8 place-items-center rounded-xl transition-colors disabled:opacity-40",
                      message.is_pinned
                        ? "bg-primary/12 text-primary-readable"
                        : "text-muted hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    {message.is_pinned ? (
                      <PinOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Pin className="size-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
