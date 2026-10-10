import type { ReactNode } from "react";
import { MotionPage } from "@/components/motion";
import {
  IslandRegistrar,
  type IslandRouteConfig,
} from "./dynamic-island";
import { pageMainClass } from "./page-main";
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

      <main className={pageMainClass(hideTabBar)}>
        <MotionPage>{children}</MotionPage>
      </main>

      {trackVisitor && <VisitorTracker />}
    </div>
  );
}
