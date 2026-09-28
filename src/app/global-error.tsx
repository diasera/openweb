"use client";

import "./globals.css";
import { buttonClass } from "@/components/ui/button";
import { StatusCard } from "@/components/ui/status-card";
import { displayFont } from "./fonts";

/** Pengganti root layout saat layout itu sendiri gagal; tanpa provider aplikasi. */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="id" className={displayFont.variable}>
      <body className="bg-bg text-foreground">
        <main className="flex min-h-dvh items-center justify-center p-6">
          <StatusCard
            code="Ups"
            title="Website sedang bermasalah"
            description="Server belum dapat memuat halaman. Coba lagi sebentar lagi."
          >
            <button type="button" onClick={reset} className={buttonClass()}>
              Coba lagi
            </button>
          </StatusCard>
        </main>
      </body>
    </html>
  );
}
