"use client";

import { usePathname } from "next/navigation";
import { getAdminRouteNavigation } from "@/lib/constants";
import { PageShell } from "@/components/public/page-shell";
import { ThemeToggle } from "@/components/public/theme-toggle";

/**
 * Child view admin tetap berada di chrome aplikasi yang sama. Dynamic Island
 * mengambil judul/back target dari registry route dan Tab Bar tetap aktif.
 */
export function AdminAreaShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navigation = getAdminRouteNavigation(pathname) ?? {
    title: "Admin",
    backHref: "/profil",
  };

  return (
    <PageShell
      header={{ variant: "sub", ...navigation, right: <ThemeToggle /> }}
      profileTabLabel="Admin"
      showNotificationPrompt={false}
      trackVisitor={false}
    >
      {children}
    </PageShell>
  );
}
