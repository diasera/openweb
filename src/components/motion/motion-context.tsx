"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { getRouteMotion, type RouteMotionKind } from "./route-motion";

interface RouteHistoryEntry {
  path: string;
  scrollTop: number;
}

interface PendingScroll {
  targetPath: string;
  top: number;
}

interface MotionIntent {
  targetPath: string;
  transition: RouteMotionKind;
}

interface MotionContextValue {
  goBack: (fallbackHref: string) => void;
  markPageReady: (pathname: string) => void;
  navigate: (href: string) => void;
  pathname: string;
  transition: RouteMotionKind;
}

const MotionContext = createContext<MotionContextValue | null>(null);

function targetPath(href: string) {
  return new URL(href, window.location.href).pathname || "/";
}

function restoreScroll(pathname: string, top: number) {
  window.scrollTo(0, top);
  requestAnimationFrame(() => {
    if (window.location.pathname === pathname) window.scrollTo(0, top);
  });
}

/**
 * Pusat navigasi dan restorasi scroll. Gerak route dikerjakan CSS agar
 * navigasi tidak pernah menunggu kompilasi, jaringan, atau data halaman.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [motionIntent, setMotionIntent] = useState<MotionIntent>({
    targetPath: pathname,
    transition: "initial",
  });
  const history = useRef<RouteHistoryEntry[]>([
    { path: pathname, scrollTop: 0 },
  ]);
  const pendingScroll = useRef<PendingScroll | null>(null);

  const transition =
    motionIntent.targetPath === pathname ? motionIntent.transition : "fade";

  const navigate = useCallback(
    (href: string) => {
      const nextPath = targetPath(href);
      if (nextPath === pathname) {
        router.push(href, { scroll: true });
        return;
      }

      setMotionIntent({
        targetPath: nextPath,
        transition: getRouteMotion(pathname, nextPath),
      });
      const currentEntry = history.current.at(-1);
      if (currentEntry?.path === pathname) currentEntry.scrollTop = window.scrollY;
      pendingScroll.current = { targetPath: nextPath, top: 0 };
      router.push(href, { scroll: false });
    },
    [pathname, router],
  );

  const goBack = useCallback(
    (fallbackHref: string) => {
      const stack = history.current;
      const currentEntry = stack.at(-1);
      if (currentEntry?.path === pathname) currentEntry.scrollTop = window.scrollY;

      const previousEntry = stack.length > 1 ? stack[stack.length - 2] : null;
      if (!previousEntry) {
        navigate(fallbackHref);
        return;
      }
      pendingScroll.current = {
        targetPath: previousEntry.path,
        top: previousEntry.scrollTop,
      };
      setMotionIntent({
        targetPath: previousEntry.path,
        transition: getRouteMotion(pathname, previousEntry.path),
      });
      router.back();
    },
    [navigate, pathname, router],
  );

  const markPageReady = useCallback((readyPath: string) => {
    const scroll = pendingScroll.current;
    if (scroll?.targetPath === readyPath) {
      pendingScroll.current = null;
      restoreScroll(readyPath, scroll.top);
    }
  }, []);

  useLayoutEffect(() => {
    const stack = history.current;
    const current = stack[stack.length - 1];
    if (current.path !== pathname) {
      if (stack.length > 1 && stack[stack.length - 2].path === pathname) {
        const restored = stack[stack.length - 2];
        stack.pop();
        if (pendingScroll.current?.targetPath !== pathname) {
          restoreScroll(pathname, restored.scrollTop);
        }
      } else {
        stack.push({ path: pathname, scrollTop: 0 });
      }
    }
  }, [pathname]);

  const value = useMemo(
    () => ({ goBack, markPageReady, navigate, pathname, transition }),
    [goBack, markPageReady, navigate, pathname, transition],
  );

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

export function useAppMotion() {
  const value = useContext(MotionContext);
  if (!value) throw new Error("useAppMotion harus dipakai di dalam MotionProvider");
  return value;
}
