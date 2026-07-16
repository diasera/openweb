"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
} from "react";
import { cn } from "@/lib/utils/cn";
import type { IslandNotice, IslandRouteConfig } from "./dynamic-island.types";
import { NoticeView } from "./views/notice-view";
import { RouteView } from "./views/route-view";
import { MusicIslandView } from "./views/music-island-view";
import { useMusic } from "@/components/public/music";
import styles from "./dynamic-island.module.css";

type IslandView =
  | { key: string; kind: "route"; config: IslandRouteConfig }
  | { key: string; kind: "notice"; notice: IslandNotice }
  | { key: string; kind: "music" };

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

function renderView(view: IslandView) {
  if (view.kind === "notice") return <NoticeView notice={view.notice} />;
  if (view.kind === "music") return <MusicIslandView />;
  return <RouteView config={view.config} />;
}

/**
 * Satu-satunya renderer Dynamic Island. Konten lama dianimasikan keluar dulu,
 * baru konten baru masuk; tidak pernah ada overlay semitransparan bertumpuk.
 */
export function DynamicIslandViewport({
  route,
  notice,
}: {
  route: IslandRouteConfig;
  notice: IslandNotice | null;
}) {
  const music = useMusic();
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
    return { key: routeKey(route), kind: "route", config: route };
  }, [music.expanded, notice, route]);

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

  return (
    <div className={styles.slot}>
      <header
        data-dynamic-island
        data-island-phase={phase}
        data-island-view={shellView.kind}
        className={cn(
          styles.shell,
          activity ? styles.activity : styles.route,
          shellView.kind === "notice" && styles.noticeActivity,
          shellView.kind === "music" && styles.musicActivity,
        )}
      >
        <div
          className={cn(
            styles.content,
            phase === "out" && styles.contentOut,
            phase === "in" && styles.contentIn,
          )}
          aria-live={
            shown.kind === "notice"
              ? shown.notice.status === "error"
                ? "assertive"
                : "polite"
              : "off"
          }
          aria-atomic={shown.kind === "notice" ? "true" : undefined}
          onAnimationEnd={onAnimationEnd}
        >
          {renderView(shown)}
        </div>
      </header>
    </div>
  );
}
