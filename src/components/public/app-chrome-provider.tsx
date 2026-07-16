"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  getAdminRouteNavigation,
  isAdminAuthRoute,
} from "@/lib/constants";
import { resolveAppChrome } from "@/lib/navigation/app-routes";
import { NotifPrompt } from "./notif-prompt";
import { TabBar } from "./tab-bar";
import { DynamicIslandContext } from "./dynamic-island/dynamic-island-context";
import { DynamicIslandViewport } from "./dynamic-island/dynamic-island-viewport";
import { ToastProvider } from "@/components/ui/toast";
import type {
  IslandNotice,
  IslandNoticeInput,
  IslandNoticePatch,
  PageChromeConfig,
  PageChromeRegistration,
} from "./dynamic-island/dynamic-island.types";

function resolveChromeConfig(
  pathname: string,
  siteName: string,
  logoUrl?: string | null,
  memberLabel = "Anggota",
): PageChromeConfig {
  if (isAdminAuthRoute(pathname)) {
    return {
      island: { variant: "title", title: "Profil Admin" },
      tabBarVisible: false,
      notificationPromptVisible: false,
    };
  }

  const adminNavigation = getAdminRouteNavigation(pathname);
  if (adminNavigation) {
    return {
      island: { variant: "sub", ...adminNavigation },
      tabBarVisible: true,
      notificationPromptVisible: false,
      profileTabLabel: "Admin",
    };
  }

  return resolveAppChrome(pathname, {
    siteName,
    logoUrl,
    memberLabel,
  });
}

function isAppChromeRoute(pathname: string) {
  return !isAdminAuthRoute(pathname);
}

/**
 * Pemilik tunggal chrome aplikasi. Provider hidup di root layout sehingga
 * Dynamic Island dan Tab Bar tidak pernah dibuat ulang saat navigasi.
 */
export function AppChromeProvider({
  siteName,
  logoUrl,
  memberLabel,
  children,
}: {
  siteName: string;
  logoUrl?: string | null;
  memberLabel?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [registered, setRegistered] = useState<{
    pathname: string;
    config: PageChromeRegistration;
  } | null>(null);
  const [notice, setNotice] = useState<IslandNotice | null>(null);
  const owner = useRef(0);
  const noticeCounter = useRef(0);
  const activeNoticeId = useRef<string | null>(null);
  const dismissTimer = useRef<{
    id: string;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const scheduleDismiss = useCallback((id: string, duration?: number) => {
    if (activeNoticeId.current !== id) return;
    if (dismissTimer.current) clearTimeout(dismissTimer.current.timer);
    dismissTimer.current = null;
    if (!duration || !Number.isFinite(duration)) return;
    const timer = setTimeout(() => {
      setNotice((current) => (current?.id === id ? null : current));
      if (activeNoticeId.current === id) activeNoticeId.current = null;
      if (dismissTimer.current?.id === id) dismissTimer.current = null;
    }, duration);
    dismissTimer.current = { id, timer };
  }, []);

  useEffect(
    () => () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current.timer);
    },
    [],
  );

  const registerPage = useCallback(
    (registeredPathname: string, config: PageChromeRegistration) => {
      const id = ++owner.current;
      setRegistered({ pathname: registeredPathname, config });
      return () => {
        if (owner.current === id) setRegistered(null);
      };
    },
    [],
  );

  const showNotice = useCallback(
    (input: IslandNoticeInput) => {
      const id = `island-notice-${++noticeCounter.current}`;
      const { duration, ...next } = input;
      activeNoticeId.current = id;
      setNotice({ id, ...next });
      scheduleDismiss(id, duration);
      return id;
    },
    [scheduleDismiss],
  );

  const updateNotice = useCallback(
    (id: string, patch: IslandNoticePatch) => {
      const { duration, ...next } = patch;
      if (activeNoticeId.current !== id) return;
      setNotice((current) =>
        current?.id === id ? { ...current, ...next } : current,
      );
      if (duration !== undefined) scheduleDismiss(id, duration);
    },
    [scheduleDismiss],
  );

  const dismissNotice = useCallback((id?: string) => {
    if (id && activeNoticeId.current !== id) return;
    if (dismissTimer.current) clearTimeout(dismissTimer.current.timer);
    dismissTimer.current = null;
    activeNoticeId.current = null;
    setNotice((current) => (!id || current?.id === id ? null : current));
  }, []);

  const context = useMemo(
    () => ({ registerPage, showNotice, updateNotice, dismissNotice }),
    [dismissNotice, registerPage, showNotice, updateNotice],
  );
  const fallback = resolveChromeConfig(pathname, siteName, logoUrl, memberLabel);
  const page: PageChromeConfig =
    registered?.pathname === pathname
      ? {
          island: registered.config.island ?? fallback.island,
          tabBarVisible:
            registered.config.tabBarVisible ?? fallback.tabBarVisible,
          notificationPromptVisible:
            registered.config.notificationPromptVisible ??
            fallback.notificationPromptVisible,
          profileTabLabel:
            registered.config.profileTabLabel ?? fallback.profileTabLabel,
        }
      : fallback;
  const visible = isAppChromeRoute(pathname);

  return (
    <DynamicIslandContext.Provider value={context}>
      <ToastProvider showNotice={showNotice} dismissNotice={dismissNotice}>
        {visible && (
          <DynamicIslandViewport route={page.island} notice={notice} />
        )}
        {children}
        {visible && page.tabBarVisible && (
          <TabBar profileLabel={page.profileTabLabel} />
        )}
        {visible && page.notificationPromptVisible && (
          <NotifPrompt siteName={siteName} />
        )}
      </ToastProvider>
    </DynamicIslandContext.Provider>
  );
}
