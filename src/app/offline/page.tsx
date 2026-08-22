import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sedang Offline",
  robots: { index: false, follow: false },
};

/** Fallback navigasi saat offline — di-precache oleh service worker. */
export default function OfflinePage() {
  return (
    <main className="app-screen bg-bg flex items-center justify-center p-6">
      <Card className="w-full max-w-sm p-8 text-center">
        <WifiOff className="text-muted mx-auto h-10 w-10" aria-hidden="true" />
        <h1 className="mt-4 text-lg font-semibold">Tidak ada koneksi</h1>
        <p className="text-muted mt-1 text-sm">
          Periksa sambungan internet kamu, lalu coba buka ulang halaman ini.
        </p>
        <Link href="/" className={buttonClass({ className: "mt-6 w-full" })}>
          Coba lagi
        </Link>
      </Card>
    </main>
  );
}
