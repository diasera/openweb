"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
} from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type {
  IslandBrand,
  IslandEvent,
  IslandExpandOptions,
  IslandNotice,
  IslandRouteConfig,
} from "./dynamic-island.types";
import { NoticeView } from "./views/notice-view";
import { RouteView } from "./views/route-view";
import { ExpandedRouteView } from "./views/expanded-route-view";
import { MusicIslandView } from "./views/music-island-view";
import { useMusic } from "@/components/public/music";
import styles from "./dynamic-island.module.css";

type IslandView =
  | { key: string; kind: "route"; config: IslandRouteConfig }
  | { key: string; kind: "notice"; notice: IslandNotice }
  | { key: string; kind: "music" }
  | { key: string; kind: "expandedRoute" };

type Phase = "idle" | "out" | "in";

function routeKey(config: IslandRouteConfig) {
  if (config.variant === "main") {
    return `route:main:${config.siteName}:${config.logoUrl ?? ""}`;
  }
  if (config.variant === "sub") {
    return `route:sub:${config.title}:${config.backHref ?? ""}:${config.close ? 1 : 0}`;
  }
  return `route:title:${config.title}`;
}

function renderView(
  view: IslandView,
  brand: IslandBrand,
  event: IslandEvent | null,
  onExpand: (options?: IslandExpandOptions) => void,
  onCollapse: () => void,
  focusSearch: boolean,
) {
  if (view.kind === "notice") return <NoticeView notice={view.notice} />;
  if (view.kind === "music") return <MusicIslandView />;
  if (view.kind === "expandedRoute") {
    return (
      <ExpandedRouteView
        brand={brand}
        event={event}
        onNavigate={onCollapse}
        autoFocusSearch={focusSearch}
      />
    );
  }
  return <RouteView config={view.config} event={event} onExpand={onExpand} />;
}

/** Pintasan Spotlight tidak boleh mencuri ketikan di kolom input/editor. */
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

/**
 * Satu-satunya renderer Dynamic Island. Konten lama dianimasikan keluar dulu,
 * baru konten baru masuk; tidak pernah ada overlay semitransparan bertumpuk.
 * Island hitam pekat dapat di-tap untuk membuka quick panel ala Live Activity.
 */
export function DynamicIslandViewport({
  route,
  notice,
  brand,
  event = null,
}: {
  route: IslandRouteConfig;
  notice: IslandNotice | null;
  brand: IslandBrand;
  event?: IslandEvent | null;
}) {
  const music = useMusic();
  const pathname = usePathname();
  // Pathname saat panel dibuka: navigasi apa pun otomatis menutup panel karena
  // routeExpanded menjadi derived state, tanpa setState di effect.
  const [expanded, setExpanded] = useState<{
    path: string;
    focusSearch: boolean;
  } | null>(null);
  const routeExpanded = expanded !== null && expanded.path === pathname;
  const collapse = () => setExpanded(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setExpanded(null);
        return;
      }
      // Ctrl/⌘ K di mana saja kecuali editor rich text (pintasannya sendiri),
      // atau "/" saat tidak sedang mengetik.
      const commandK =
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k" &&
        !(event.target instanceof HTMLElement && event.target.isContentEditable);
      const slash =
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !isTypingTarget(event.target);
      if (!commandK && !slash) return;
      event.preventDefault();
      setExpanded({ path: pathname, focusSearch: true });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname]);

  const target = useMemo<IslandView>(() => {
    if (notice) {
      return {
        key: `notice:${notice.id}:${notice.status}`,
        kind: "notice",
        notice,
      };
    }
    if (music.expanded) {
      return {
        // Context memperbarui isi player; key stabil mencegah seluruh panel
        // berkedip ketika status atau lagu berganti.
        key: "music",
        kind: "music",
      };
    }
    if (routeExpanded) {
      return { key: `expandedRoute:${pathname}`, kind: "expandedRoute" };
    }
    return { key: routeKey(route), kind: "route", config: route };
  }, [music.expanded, notice, route, routeExpanded, pathname]);

  const [shown, setShown] = useState<IslandView>(target);
  const [phase, setPhase] = useState<Phase>("idle");
  const pending = useRef<IslandView>(target);

  useEffect(() => {
    pending.current = target;
    let frame = 0;
    if (target.key === shown.key) {
      if (target !== shown) {
        frame = requestAnimationFrame(() => setShown(target));
      }
    } else if (phase === "idle") {
      frame = requestAnimationFrame(() => setPhase("out"));
    }
    return () => cancelAnimationFrame(frame);
  }, [phase, shown, target]);

  function onAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    if (phase === "out") {
      setShown(pending.current);
      setPhase("in");
      return;
    }
    if (phase === "in") {
      setPhase(pending.current.key === shown.key ? "idle" : "out");
    }
  }

  // Bentuk tujuan mulai bermorf saat konten lama keluar. Dengan begitu panel
  // terasa sebagai satu permukaan elastis, bukan dua kartu yang bergantian.
  const shellView = phase === "out" ? target : shown;
  const activity = shellView.kind !== "route";
  // Wilayah live selalu terpasang: pembaca layar hanya mengumumkan perubahan
  // isi, bukan region yang baru disisipkan bersamaan dengan kontennya.
  const announcement = notice
    ? [notice.title, notice.description].filter(Boolean).join(". ")
    : "";
  const errorNotice = notice?.status === "error";

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {errorNotice ? "" : announcement}
      </p>
      <p className="sr-only" role="alert" aria-atomic="true">
        {errorNotice ? announcement : ""}
      </p>
      {routeExpanded && (
        <div
          className={styles.backdrop}
          onClick={collapse}
          aria-hidden="true"
        />
      )}
      <div className={styles.slot}>
        <header
          data-dynamic-island
          data-island-phase={phase}
          data-island-view={shellView.kind}
          className={cn(
            "glass-material",
            styles.shell,
            activity ? styles.activity : styles.route,
            shellView.kind === "notice" && styles.noticeActivity,
            shellView.kind === "music" && styles.musicActivity,
            shellView.kind === "expandedRoute" && styles.expandedRoute,
            shellView.kind === "expandedRoute" && event && styles.expandedRouteEvent,
          )}
        >
          <div
            className={cn(
              styles.content,
              phase === "out" && styles.contentOut,
              phase === "in" && styles.contentIn,
            )}
            onAnimationEnd={onAnimationEnd}
          >
            {renderView(
              shown,
              brand,
              event,
              (options) =>
                setExpanded({
                  path: pathname,
                  focusSearch: Boolean(options?.focusSearch),
                }),
              collapse,
              Boolean(expanded?.focusSearch),
            )}
          </div>
        </header>
      </div>
    </>
  );
}
