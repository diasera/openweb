import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ownerExists } from "@/lib/auth";
import { ADMIN_AUTH_PATHS } from "@/lib/constants";
import { AuthShell } from "@/components/admin/auth-shell";
import { LoginForm } from "@/components/admin/login-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Masuk Admin" };

/** Bila owner belum pernah dibuat, alihkan ke setup (sesuai spesifikasi). */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!(await ownerExists())) redirect(ADMIN_AUTH_PATHS.setup);
  const { next } = await searchParams;

  return (
    <AuthShell title="Masuk Admin" subtitle="Login owner atau admin.">
      <LoginForm next={next} />
    </AuthShell>
  );
}
