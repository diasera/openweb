import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ownerExists } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { ADMIN_AUTH_PATHS } from "@/lib/constants";
import { AuthShell, SetupForm } from "@/components/auth";

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
    <AuthShell
      title="Setup Owner"
      subtitle="Buat akun owner pertama untuk mengelola seluruh website."
      logoUrl={settings.logo_url}
      siteName={settings.site_name}
    >
      <SetupForm />
    </AuthShell>
  );
}
