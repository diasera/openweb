"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  FileText,
  Home,
  LayoutGrid,
  Plus,
  User,
  type LucideIcon,
} from "lucide-react";
import { MotionLink } from "@/components/motion";
import {
  APP_TAB_ROUTES,
  getActiveAppTabIndex,
  type AppTabId,
} from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils/cn";

const TAB_ICONS: Record<AppTabId, LucideIcon> = {
  home: Home,
  gallery: LayoutGrid,
  blog: FileText,
  profile: User,
};

const TABS = APP_TAB_ROUTES.map(({ id, href, label }) => ({
  id,
  href,
  label,
  icon: TAB_ICONS[id],
}));

function useCompactOnScroll(pathname: string) {
  const [compact, setCompact] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const resetFrame = requestAnimationFrame(() => setCompact(false));
    let scrollFrame = 0;
    lastY.current = window.scrollY;
    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      scrollFrame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const goingDown = y > lastY.current + 4;
        const goingUp = y < lastY.current - 4;
        if (y < 48) setCompact(false);
        else if (goingDown) setCompact(true);
        else if (goingUp) setCompact(false);
        lastY.current = y;
        ticking.current = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(resetFrame);
      cancelAnimationFrame(scrollFrame);
      ticking.current = false;
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  return compact;
}

/** Ukur posisi tab di bar persisten agar pill benar-benar meluncur antar-route. */
function useActivePill(activeIndex: number) {
  const listRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || activeIndex < 0) {
      setPill(null);
      return;
    }

    let frame = 0;
    const measure = () => {
      const element = list.querySelector<HTMLElement>(
        `[data-tab-index="${activeIndex}"]`,
      );
      if (!element) return;

      const next = {
        x: element.offsetLeft,
        y: element.offsetTop,
        w: element.offsetWidth,
        h: element.offsetHeight,
      };
      setPill((current) =>
        current &&
        current.x === next.x &&
        current.y === next.y &&
        current.w === next.w &&
        current.h === next.h
          ? current
          : next,
      );
    };
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    // Ukur sebelum paint pertama agar pill tidak berkedip di posisi (0, 0).
    measure();

    // Mode compact mengubah ukuran elemen, bukan ukuran window. Observer
    // menjaga pill tepat selama padding bar bertransisi.
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleMeasure);
    observer?.observe(list);
    list
      .querySelectorAll<HTMLElement>("[data-tab-index], [data-tab-fab]")
      .forEach((element) => observer?.observe(element));

    list.addEventListener("transitionend", scheduleMeasure);
    window.addEventListener("resize", scheduleMeasure);
    window.visualViewport?.addEventListener("resize", scheduleMeasure);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      list.removeEventListener("transitionend", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
      window.visualViewport?.removeEventListener("resize", scheduleMeasure);
    };
  }, [activeIndex]);

  return { listRef, pill };
}

/** Satu Tab Bar persisten untuk halaman publik dan child view admin. */
export function TabBar({ profileLabel = "Profil" }: { profileLabel?: string }) {
  const pathname = usePathname();
  const compact = useCompactOnScroll(pathname);
  const activeIndex = getActiveAppTabIndex(pathname);
  const { listRef, pill } = useActivePill(activeIndex);

  return (
    <nav
      className={cn(
        "motion-tabbar-shell safe-bottom safe-inline fixed inset-x-0 bottom-0 z-40 flex justify-center",
        compact && "translate-y-1 opacity-[0.96]",
      )}
      aria-label="Navigasi utama"
    >
      <div
        ref={listRef}
        className={cn(
          "motion-tabbar-body floating-tabbar relative flex items-center gap-0.5 px-2.5 py-2",
          compact && "py-1.5",
        )}
      >
        <span
          aria-hidden="true"
          className="tab-active-pill"
          style={
            pill
              ? {
                  transform: `translate(${pill.x}px, ${pill.y}px)`,
                  width: pill.w,
                  height: pill.h,
                  opacity: 1,
                }
              : { opacity: 0, width: 0, height: 0 }
          }
        />

        {TABS.slice(0, 2).map((tab, index) => (
          <TabLink
            key={tab.id}
            {...tab}
            label={tab.id === "profile" ? profileLabel : tab.label}
            index={index}
            active={activeIndex === index}
            compact={compact}
          />
        ))}

        <MotionLink
          href="/buat"
          aria-label="Buat pin"
          data-tab-fab
          className={cn(
            "floating-action-button group mx-1 grid h-12 w-12 shrink-0 place-items-center rounded-full text-white",
          )}
        >
          <Plus
            className="motion-fab-icon relative z-10 h-[22px] w-[22px]"
            strokeWidth={2.5}
            aria-hidden="true"
          />
        </MotionLink>

        {TABS.slice(2).map((tab, offset) => {
          const index = offset + 2;
          return (
            <TabLink
              key={tab.id}
              {...tab}
              label={tab.id === "profile" ? profileLabel : tab.label}
              index={index}
              active={activeIndex === index}
              compact={compact}
            />
          );
        })}
      </div>
    </nav>
  );
}

function TabLink({
  href,
  label,
  icon: Icon,
  active,
  index,
  compact,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  index: number;
  compact: boolean;
}) {
  return (
    <MotionLink
      href={href}
      prefetch={active ? false : undefined}
      onClick={(event) => {
        if (!active) return;
        event.preventDefault();
        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      }}
      data-tab-index={index}
      aria-current={active ? "page" : undefined}
      className={cn(
        "motion-tab-item relative z-10 flex h-12 w-[60px] flex-col items-center justify-center rounded-full",
        compact ? "gap-0" : "gap-1",
        active ? "text-primary-readable" : "text-muted hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "motion-tab-icon h-[21px] w-[21px]",
          !active && "opacity-75",
          active && "animate-tab-pop",
        )}
        strokeWidth={active ? 2.5 : 2}
        aria-hidden="true"
      />
      <span
        className={cn(
          "motion-tab-label overflow-hidden text-[10px] font-semibold leading-none",
          compact
            ? "max-h-0 -translate-y-0.5 opacity-0"
            : "max-h-3 translate-y-0 opacity-100",
        )}
      >
        {label}
      </span>
    </MotionLink>
  );
}
