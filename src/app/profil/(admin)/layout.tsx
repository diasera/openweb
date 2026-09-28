import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminAreaShell } from "@/components/admin/admin-area-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Guard bersama seluruh child view admin. Shell hanya mendaftarkan child view
 * ke Dynamic Island/Tab Bar global; tidak membuat sidebar atau top bar kedua.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <AdminAreaShell>{children}</AdminAreaShell>
  );
}
