"use client";

import { usePathname } from "next/navigation";
import { getAdminRouteNavigation } from "@/lib/constants";
import { PageShell } from "@/components/public/page-shell";
import { ThemeToggle } from "@/components/public/theme-toggle";

/**
 * Child view admin tetap berada di chrome aplikasi yang sama: Dynamic Island
 * mengambil judul/target kembali dari registry route (src/lib/constants.ts)
 * dan Tab Bar tetap aktif dengan label "Admin". Tidak ada sidebar kedua.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navigation = getAdminRouteNavigation(pathname);

  return (
    <PageShell
      header={{
        variant: "sub",
        title: navigation?.title ?? "Admin",
        backHref: navigation?.backHref ?? "/profil",
        right: <ThemeToggle />,
      }}
      profileTabLabel="Admin"
      showNotificationPrompt={false}
      trackVisitor={false}
    >
      {children}
    </PageShell>
  );
}
