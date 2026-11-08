import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdmin, ownerExists } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { ADMIN_AUTH_PATHS } from "@/lib/constants";
import { AuthCard, LoginForm } from "@/components/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Masuk Admin",
  robots: { index: false, follow: false },
};

/** Owner belum pernah dibuat -> setup. Sesi yang masih berlaku -> kembali ke Profil. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!(await ownerExists())) redirect(ADMIN_AUTH_PATHS.setup);
  if (await getCurrentAdmin()) redirect("/profil");
  const [{ next }, settings] = await Promise.all([searchParams, getSettings()]);

  return (
    <AuthCard
      siteName={settings.site_name}
      logoUrl={settings.logo_url}
      eyebrow="Area pengelola"
      title="Selamat datang kembali"
      subtitle={`Masuk untuk mengelola konten dan tampilan ${settings.site_name}.`}
      footer="Lupa password? Minta owner mengatur ulang dari menu Admin."
    >
      <LoginForm next={next} />
    </AuthCard>
  );
}
