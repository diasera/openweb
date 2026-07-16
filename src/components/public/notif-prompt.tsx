"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBellSubscription } from "./use-bell-subscription";

/** Popup bottom-sheet ajakan mengaktifkan notifikasi (muncul sekali, lalu diingat). */
export function NotifPrompt({ siteName }: { siteName: string }) {
  const [show, setShow] = useState(false);
  const bell = useBellSubscription(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("notifPrompt")) return;
    } catch {
      return;
    }
    const t = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(t);
  }, []);

  function remember() {
    try {
      localStorage.setItem("notifPrompt", "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  async function allow() {
    if (await bell.setEnabled(true)) remember();
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:justify-end lg:px-0">
      <Card
        variant="elevated"
        className="animate-sheet-in w-full max-w-sm rounded-ios-lg p-4 shadow-elevated"
      >
        <div className="flex gap-3">
          <span className="bg-primary shadow-primary/30 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-lg">
            <Bell className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">Aktifkan Notifikasi</p>
            <p className="text-muted text-sm">
              Dapatkan pemberitahuan saat ada artikel baru atau update dari {siteName}.
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Button onClick={allow} disabled={bell.pending} className="flex-1">
            {bell.pending ? "Mengaktifkan…" : "Izinkan"}
          </Button>
          <Button variant="outline" onClick={remember} className="flex-1">
            Nanti Saja
          </Button>
        </div>
      </Card>
    </div>
  );
}
