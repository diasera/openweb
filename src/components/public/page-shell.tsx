import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { MotionPage } from "@/components/motion";
import {
  IslandRegistrar,
  type IslandRouteConfig,
} from "./dynamic-island";
import { VisitorTracker } from "./visitor-tracker";

/**
 * Kerangka konten halaman aplikasi. Dynamic Island + Tab Bar dirender satu kali
 * oleh AppChromeProvider; shell ini hanya mendaftarkan konfigurasi halaman.
 */
export function PageShell({
  header,
  hideTabBar,
  profileTabLabel,
  showNotificationPrompt,
  trackVisitor = true,
  children,
}: {
  header?: IslandRouteConfig;
  hideTabBar?: boolean;
  profileTabLabel?: "Profil" | "Admin";
  showNotificationPrompt?: boolean;
  trackVisitor?: boolean;
  children: ReactNode;
}) {
  const tabBarVisible =
    hideTabBar === undefined ? undefined : !hideTabBar;
  const notificationPromptVisible =
    showNotificationPrompt ?? tabBarVisible;

  return (
    <div className="page-shell">
      <IslandRegistrar
        config={{
          ...(header ? { island: header } : {}),
          ...(tabBarVisible !== undefined
            ? { tabBarVisible }
            : {}),
          ...(notificationPromptVisible !== undefined
            ? { notificationPromptVisible }
            : {}),
          ...(profileTabLabel ? { profileTabLabel } : {}),
        }}
      />

      <main
        className={cn(
          "mx-auto max-w-2xl px-4 pt-4 lg:max-w-5xl lg:px-6 lg:pt-6",
          hideTabBar ? "pb-10" : "pb-32",
        )}
      >
        <MotionPage>{children}</MotionPage>
      </main>

      {trackVisitor && <VisitorTracker />}
    </div>
  );
}
