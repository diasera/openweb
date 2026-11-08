"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { StatusCard } from "@/components/ui/status-card";
import { MotionLink, MotionPage } from "@/components/motion";

/** Batas error rute: data gagal dimuat tampil jujur dengan opsi coba lagi. */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route-error]", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="app-screen bg-bg flex items-center justify-center p-6">
      <MotionPage profile="fade" className="w-full max-w-sm">
        <StatusCard
          code="Ups"
          title="Halaman belum bisa dimuat"
          description="Koneksi ke server sedang bermasalah. Coba lagi sebentar lagi."
        >
          <Button onClick={reset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Coba lagi
          </Button>
          <MotionLink href="/" className={buttonClass({ variant: "outline" })}>
            Beranda
          </MotionLink>
        </StatusCard>
      </MotionPage>
    </main>
  );
}
