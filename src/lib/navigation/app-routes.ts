/**
 * Registry tunggal hubungan route publik. Chrome, tab aktif, dan arah motion
 * membaca data yang sama agar judul, parent, serta visibilitas tidak drift.
 * File ini client-safe: tidak mengimpor React, Next server API, atau database.
 */

export type AppTabId = "home" | "gallery" | "blog" | "profile";

interface AppNavigationContext {
  siteName: string;
  logoUrl?: string | null;
  memberLabel: string;
}

type RouteTitle =
  | string
  | ((context: Pick<AppNavigationContext, "memberLabel">) => string);

interface AppRouteMotion {
  level: number;
  parent?: string;
  presentation?: boolean;
}

type RouteIslandDefaults =
  | { variant: "main" }
  | { variant: "title"; title: RouteTitle }
  | {
      variant: "sub";
      title: RouteTitle;
      backHref: string;
      close?: boolean;
    };

interface RouteChromeDefaults {
  island: RouteIslandDefaults;
  tabBarVisible: boolean;
  notificationPromptVisible: boolean;
}

interface RouteTabDefaults {
  id: AppTabId;
  label: string;
  activeOnChildren: boolean;
}

interface AppRouteDefinition {
  id: string;
  path: string;
  match: "exact" | "children";
  chrome: RouteChromeDefaults;
  motion: AppRouteMotion;
  tab?: RouteTabDefaults;
}

interface AppTabRoute extends RouteTabDefaults {
  href: string;
}

interface ResolvedAppChrome {
  island:
    | {
        variant: "main";
        siteName: string;
        logoUrl?: string | null;
      }
    | { variant: "title"; title: string }
    | {
        variant: "sub";
        title: string;
        backHref: string;
        close?: boolean;
      };
  tabBarVisible: boolean;
  notificationPromptVisible: boolean;
}

/** Urutan exact harus mendahului matcher child dengan base path yang sama. */
const APP_ROUTE_REGISTRY: readonly AppRouteDefinition[] = [
  {
    id: "home",
    path: "/",
    match: "exact",
    chrome: {
      island: { variant: "main" },
      tabBarVisible: true,
      notificationPromptVisible: true,
    },
    motion: { level: 0 },
    tab: { id: "home", label: "Home", activeOnChildren: false },
  },
  {
    id: "gallery",
    path: "/galeri",
    match: "exact",
    chrome: {
      island: { variant: "title", title: "Galeri" },
      tabBarVisible: true,
      notificationPromptVisible: true,
    },
    motion: { level: 0 },
    tab: { id: "gallery", label: "Galeri", activeOnChildren: true },
  },
  {
    id: "blog",
    path: "/blog",
    match: "exact",
    chrome: {
      island: { variant: "title", title: "Blog" },
      tabBarVisible: true,
      notificationPromptVisible: true,
    },
    motion: { level: 0 },
    tab: { id: "blog", label: "Blog", activeOnChildren: true },
  },
  {
    id: "profile",
    path: "/profil",
    match: "exact",
    chrome: {
      island: { variant: "title", title: "Profil" },
      tabBarVisible: true,
      notificationPromptVisible: true,
    },
    motion: { level: 0 },
    tab: { id: "profile", label: "Profil", activeOnChildren: true },
  },
  {
    id: "create",
    path: "/buat",
    match: "exact",
    chrome: {
      island: {
        variant: "sub",
        title: "Buat Pin",
        backHref: "/",
        close: true,
      },
      tabBarVisible: false,
      notificationPromptVisible: false,
    },
    motion: { level: 1, parent: "/", presentation: true },
  },
  {
    id: "members",
    path: "/anggota",
    match: "exact",
    chrome: {
      island: {
        variant: "sub",
        title: ({ memberLabel }) => memberLabel,
        backHref: "/",
      },
      tabBarVisible: true,
      notificationPromptVisible: true,
    },
    motion: { level: 1, parent: "/" },
  },
  {
    id: "messages",
    path: "/pesan",
    match: "exact",
    chrome: {
      island: { variant: "sub", title: "Pesan Anonim", backHref: "/" },
      tabBarVisible: true,
      notificationPromptVisible: true,
    },
    motion: { level: 1, parent: "/" },
  },
  {
    id: "notifications",
    path: "/notifikasi",
    match: "exact",
    chrome: {
      island: { variant: "sub", title: "Notifikasi", backHref: "/" },
      tabBarVisible: true,
      notificationPromptVisible: true,
    },
    motion: { level: 1, parent: "/" },
  },
  {
    id: "about",
    path: "/tentang",
    match: "exact",
    chrome: {
      island: { variant: "sub", title: "Tentang", backHref: "/profil" },
      tabBarVisible: true,
      notificationPromptVisible: true,
    },
    motion: { level: 1, parent: "/profil" },
  },
  {
    id: "privacy",
    path: "/privasi",
    match: "exact",
    chrome: {
      island: { variant: "sub", title: "Privasi", backHref: "/profil" },
      tabBarVisible: true,
      notificationPromptVisible: false,
    },
    motion: { level: 1, parent: "/profil" },
  },
  {
    id: "blog-detail",
    path: "/blog",
    match: "children",
    chrome: {
      island: { variant: "sub", title: "", backHref: "/blog" },
      tabBarVisible: true,
      notificationPromptVisible: true,
    },
    motion: { level: 2, parent: "/blog" },
  },
  {
    id: "pin-detail",
    path: "/pin",
    match: "children",
    chrome: {
      island: { variant: "sub", title: "", backHref: "/galeri" },
      tabBarVisible: true,
      notificationPromptVisible: true,
    },
    motion: { level: 2, parent: "/galeri" },
  },
  {
    id: "member-profile",
    path: "/profil",
    match: "children",
    chrome: {
      island: { variant: "sub", title: "", backHref: "/anggota" },
      tabBarVisible: true,
      notificationPromptVisible: true,
    },
    motion: { level: 2, parent: "/anggota" },
  },
];

export const APP_TAB_ROUTES: readonly AppTabRoute[] =
  APP_ROUTE_REGISTRY.flatMap((route) =>
    route.tab ? [{ ...route.tab, href: route.path }] : [],
  );

export function normalizeAppPath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "");
}

function matchesRoute(
  pathname: string,
  route: Pick<AppRouteDefinition, "match" | "path">,
): boolean {
  return route.match === "exact"
    ? pathname === route.path
    : pathname.startsWith(`${route.path}/`);
}

function resolveAppRoute(
  pathname: string,
): AppRouteDefinition | null {
  const normalized = normalizeAppPath(pathname);
  return (
    APP_ROUTE_REGISTRY.find((route) => matchesRoute(normalized, route)) ?? null
  );
}

export function resolveAppRouteMotion(
  pathname: string,
): AppRouteMotion | null {
  return resolveAppRoute(pathname)?.motion ?? null;
}

function resolveTitle(
  title: RouteTitle,
  context: Pick<AppNavigationContext, "memberLabel">,
): string {
  return typeof title === "function" ? title(context) : title;
}

/** Unknown public paths keep the same main-island fallback as before. */
export function resolveAppChrome(
  pathname: string,
  context: AppNavigationContext,
): ResolvedAppChrome {
  const route = resolveAppRoute(pathname) ?? APP_ROUTE_REGISTRY[0]!;
  const defaults = route.chrome;
  const island = defaults.island;

  if (island.variant === "main") {
    return {
      ...defaults,
      island: {
        variant: "main",
        siteName: context.siteName,
        logoUrl: context.logoUrl,
      },
    };
  }

  return {
    ...defaults,
    island: {
      ...island,
      title: resolveTitle(island.title, context),
    },
  };
}

export function getTopLevelAppTabIndex(pathname: string): number {
  const normalized = normalizeAppPath(pathname);
  return APP_TAB_ROUTES.findIndex((tab) => tab.href === normalized);
}

export function getActiveAppTabIndex(pathname: string): number {
  const normalized = normalizeAppPath(pathname);
  return APP_TAB_ROUTES.findIndex(
    (tab) =>
      normalized === tab.href ||
      (tab.activeOnChildren && normalized.startsWith(`${tab.href}/`)),
  );
}
