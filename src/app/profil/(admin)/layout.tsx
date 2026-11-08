import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Guard bersama seluruh child view admin. Shell hanya mendaftarkan child view
 * ke Dynamic Island/Tab Bar global; tidak membuat sidebar atau top bar kedua.
 * Setiap Server Action tetap memanggil requireFeature/requireAdmin sendiri
 * karena action bisa dikirim langsung tanpa melewati layout ini.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
