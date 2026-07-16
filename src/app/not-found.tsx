import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MotionLink, MotionPage } from "@/components/motion";

export default function NotFound() {
  return (
    <main className="app-screen bg-bg flex items-center justify-center p-6">
      <MotionPage profile="fade" className="w-full max-w-sm">
      <Card variant="elevated" className="w-full max-w-sm rounded-ios-lg p-8 text-center shadow-elevated">
        <p className="font-display text-primary-readable text-6xl font-extrabold leading-none">
          404
        </p>
        <h1 className="font-display mt-3 text-xl font-bold">
          Halaman tidak ditemukan
        </h1>
        <p className="text-muted mt-1 text-sm">
          Mungkin sudah dihapus atau link-nya tidak valid.
        </p>
        <MotionLink href="/" className={buttonClass({ className: "mt-5" })}>
          Kembali ke Beranda
        </MotionLink>
      </Card>
      </MotionPage>
    </main>
  );
}
