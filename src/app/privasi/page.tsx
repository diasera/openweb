import type { Metadata } from "next";
import { Cookie, Database, ShieldCheck } from "lucide-react";
import { getSettings } from "@/lib/data";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { PageShell } from "@/components/public/page-shell";
import { Card } from "@/components/ui/card";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildPageMetadata(settings, PUBLIC_PAGE_SEO.privasi);
}

const sections = [
  {
    icon: Database,
    title: "Data yang diproses",
    body: "Saat halaman dikunjungi, website dapat mencatat ID pengunjung, alamat IP, informasi browser/perangkat, dan waktu untuk statistik serta keamanan. Saat pengunjung mengirim komentar, pesan, atau media, isi kiriman juga diproses untuk moderasi dan pencegahan penyalahgunaan. Membaca halaman publik tidak diblokir berdasarkan IP.",
  },
  {
    icon: Cookie,
    title: "Cookie, analitik, dan iklan",
    body: "Website memakai cookie atau penyimpanan lokal untuk sesi admin, preferensi tema, musik, dan fitur pengunjung. Google Analytics dan Google AdSense hanya dimuat bila diaktifkan admin. Layanan Google dapat memakai cookie atau teknologi serupa sesuai kebijakan mereka.",
  },
  {
    icon: ShieldCheck,
    title: "Penggunaan dan pilihan pengguna",
    body: "Data digunakan untuk menjalankan fitur, meninjau kiriman, menjaga keamanan, dan memahami performa website. Jangan kirim data sensitif melalui fitur publik. Kamu dapat menolak notifikasi, menonaktifkan musik, menghapus penyimpanan situs di browser, atau menghubungi pengelola untuk pertanyaan terkait data.",
  },
] as const;

export default async function PrivacyPage() {
  const settings = await getSettings();
  return (
    <PageShell
      header={{ variant: "sub", title: "Privasi", backHref: "/profil" }}
    >
      <article className="mx-auto max-w-2xl space-y-4">
        <div className="px-1">
          <p className="text-primary-readable text-xs font-bold uppercase tracking-[0.15em]">
            Transparansi data
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold">
            Kebijakan Privasi
          </h1>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            Penjelasan ringkas tentang cara {settings.site_name} menjalankan
            fitur publik, analitik, dan monetisasi.
          </p>
        </div>

        {sections.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="p-5">
            <span className="bg-primary/10 text-primary-readable grid h-10 w-10 place-items-center rounded-xl">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="font-display mt-4 text-lg font-bold">{title}</h2>
            <p className="text-muted mt-2 text-sm leading-relaxed">{body}</p>
          </Card>
        ))}

        <Card className="p-5">
          <h2 className="font-display text-lg font-bold">Kontak pengelola</h2>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            {settings.contact_email
              ? `Pertanyaan privasi dapat dikirim ke ${settings.contact_email}.`
              : "Gunakan kanal kontak resmi yang dicantumkan pengelola website."}
          </p>
        </Card>
      </article>
    </PageShell>
  );
}
