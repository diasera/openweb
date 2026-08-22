import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ownerExists } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { ADMIN_AUTH_PATHS } from "@/lib/constants";
import { AuthShell, LoginForm } from "@/components/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Masuk Admin",
  robots: { index: false, follow: false },
};

/** Bila owner belum pernah dibuat, alihkan ke setup (sesuai spesifikasi). */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!(await ownerExists())) redirect(ADMIN_AUTH_PATHS.setup);
  const [{ next }, settings] = await Promise.all([
    searchParams,
    getSettings(),
  ]);

  return (
    <AuthShell
      title="Masuk Admin"
      subtitle="Login owner atau admin."
      logoUrl={settings.logo_url}
      siteName={settings.site_name}
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
