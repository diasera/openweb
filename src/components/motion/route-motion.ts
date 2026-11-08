import { isAdminProfileRoute } from "@/lib/constants";
import {
  getTopLevelAppTabIndex,
  normalizeAppPath,
  resolveAppRouteMotion,
} from "@/lib/navigation/app-routes";

export type RouteMotionKind =
  | "initial"
  | "tab-forward"
  | "tab-back"
  | "forward"
  | "back"
  | "present"
  | "dismiss"
  | "utility"
  | "fade";

interface RouteDescriptor {
  level: number;
  parent?: string;
  presentation?: boolean;
  tabIndex?: number;
  utility?: boolean;
}

function describeRoute(pathname: string): RouteDescriptor {
  const path = normalizeAppPath(pathname);
  const tabIndex = getTopLevelAppTabIndex(path);
  if (tabIndex >= 0) return { level: 0, tabIndex };

  if (isAdminProfileRoute(path)) {
    return {
      level: path.split("/").filter(Boolean).length,
      parent: "/profil",
      utility: true,
    };
  }

  const registered = resolveAppRouteMotion(path);
  if (registered) return registered;

  return { level: path.split("/").filter(Boolean).length };
}

/**
 * Satu kamus hubungan route untuk seluruh aplikasi. Komponen halaman tidak
 * menentukan arah/durasi sendiri; mereka hanya memakai hasil semantik ini.
 */
export function getRouteMotion(
  previousPathname: string,
  nextPathname: string,
): RouteMotionKind {
  const previousPath = normalizeAppPath(previousPathname);
  const nextPath = normalizeAppPath(nextPathname);
  if (previousPath === nextPath) return "initial";

  const previous = describeRoute(previousPath);
  const next = describeRoute(nextPath);

  if (next.presentation) return "present";
  if (previous.presentation) return "dismiss";
  if (previous.utility && next.utility) return "utility";

  if (previous.tabIndex !== undefined && next.tabIndex !== undefined) {
    return next.tabIndex > previous.tabIndex ? "tab-forward" : "tab-back";
  }

  if (next.parent === previousPath) return "forward";
  if (previous.parent === nextPath) return "back";
  if (next.level > previous.level) return "forward";
  if (next.level < previous.level) return "back";

  return "fade";
}
