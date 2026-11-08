import { buttonClass } from "@/components/ui/button";
import { StatusCard } from "@/components/ui/status-card";
import { MotionLink, MotionPage } from "@/components/motion";

export default function NotFound() {
  return (
    <main className="app-screen bg-bg flex items-center justify-center p-6">
      <MotionPage profile="fade" className="w-full max-w-sm">
        <StatusCard
          code="404"
          title="Halaman tidak ditemukan"
          description="Mungkin sudah dihapus atau link-nya tidak valid."
        >
          <MotionLink href="/" className={buttonClass()}>
            Kembali ke Beranda
          </MotionLink>
        </StatusCard>
      </MotionPage>
    </main>
  );
}
