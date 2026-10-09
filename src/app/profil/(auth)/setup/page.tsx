import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ownerExists } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { ADMIN_AUTH_PATHS } from "@/lib/constants";
import { AuthCard, SetupForm } from "@/components/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Setup Owner",
  robots: { index: false, follow: false },
};

/** Kunjungan pertama: bila owner belum ada -> buat di sini. Jika sudah -> login. */
export default async function SetupPage() {
  if (await ownerExists()) redirect(ADMIN_AUTH_PATHS.login);
  const settings = await getSettings();

  return (
    <AuthCard
      siteName={settings.site_name}
      logoUrl={settings.logo_url}
      eyebrow="Instalasi baru"
      title="Buat akun owner"
      subtitle="Akun pertama memegang semua izin dan dapat menambah admin lain."
      footer="Password disimpan sebagai hash scrypt, bukan teks asli."
    >
      <SetupForm />
    </AuthCard>
  );
}
