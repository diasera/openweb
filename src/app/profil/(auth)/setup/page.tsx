import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ownerExists } from "@/lib/auth";
import { ADMIN_AUTH_PATHS } from "@/lib/constants";
import { AuthShell } from "@/components/admin/auth-shell";
import { SetupForm } from "@/components/admin/setup-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Setup Owner" };

/** Kunjungan pertama: bila owner belum ada -> buat di sini. Jika sudah -> login. */
export default async function SetupPage() {
  if (await ownerExists()) redirect(ADMIN_AUTH_PATHS.login);

  return (
    <AuthShell
      title="Setup Owner"
      subtitle="Buat akun owner pertama untuk mengelola seluruh website."
    >
      <SetupForm />
    </AuthShell>
  );
}
