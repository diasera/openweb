"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconPlate } from "@/components/ui/icon-plate";
import {
  hasStorage,
  readStorage,
  STORAGE_KEYS,
  writeStorage,
} from "@/lib/utils/storage";
import { useBellSubscription } from "./use-bell-subscription";

const SNOOZE_MS = 7 * 86_400_000;

function isPromptSuppressed(): boolean {
  const stored = readStorage(STORAGE_KEYS.notificationPrompt);
  if (!stored) return false;
  if (stored === "1") return true;
  const until = Number.parseInt(stored, 10);
  return Number.isFinite(until) && Date.now() < until;
}

/**
 * Banner kaca ringkas ajakan notifikasi. Otomatis sembunyi di mode demo,
 * saat izin browser sudah diputuskan (`granted` / `denied`), dan menunda
 * pengingat selama 7 hari bila ditutup dengan "Nanti saja".
 */
export function NotifPrompt({
  siteName,
  canSubscribe = true,
}: {
  siteName: string;
  canSubscribe?: boolean;
}) {
  const [show, setShow] = useState(false);
  const bell = useBellSubscription(false);

  useEffect(() => {
    if (!canSubscribe || !hasStorage() || isPromptSuppressed()) return;
    if (
      typeof Notification !== "undefined" &&
      Notification.permission !== "default"
    ) {
      return;
    }
    const timer = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(timer);
  }, [canSubscribe]);

  function dismissForever() {
    writeStorage(STORAGE_KEYS.notificationPrompt, "1");
    setShow(false);
  }

  function snooze() {
    writeStorage(STORAGE_KEYS.notificationPrompt, String(Date.now() + SNOOZE_MS));
    setShow(false);
  }

  async function allow() {
    if (await bell.setEnabled(true)) dismissForever();
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-3 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:px-0">
      <section
        aria-label="Ajakan notifikasi"
        className="animate-sheet-in sheet-panel flex w-full max-w-md items-center gap-3 rounded-ios-lg py-2.5 pl-2.5 pr-2"
      >
        <IconPlate icon={Bell} className="bg-primary text-primary-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-subhead font-semibold leading-tight">
            Aktifkan notifikasi
          </p>
          <p className="text-muted truncate text-caption1">
            Kabar artikel &amp; update terbaru dari {siteName}.
          </p>
        </div>
        <Button
          size="sm"
          onClick={allow}
          disabled={bell.pending}
          className="shrink-0"
        >
          {bell.pending ? "Mengaktifkan…" : "Izinkan"}
        </Button>
        <button
          type="button"
          onClick={snooze}
          aria-label="Ingatkan lagi nanti"
          title="Tunda 7 hari"
          className="motion-pressable text-muted hover:bg-surface-2 grid size-9 shrink-0 place-items-center rounded-full"
        >
          <X className="size-4.5" aria-hidden="true" />
        </button>
      </section>
    </div>
  );
}
