"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Bell, Search, type LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/public/theme-toggle";
import { MusicQuickButton } from "@/components/public/music";
import { SiteLogo } from "@/components/public/site-logo";
import {
  DESTINATION_ICONS,
  destinationIcon,
} from "@/components/public/destination-icons";
import { MotionLink, useAppMotion } from "@/components/motion";
import { iconButtonClass } from "@/components/ui/icon-button";
import { Skeleton, SkeletonScreen, skeletonWave } from "@/components/ui/skeleton";
import { ApiError, requestJson } from "@/lib/api/client";
import { APP_TAB_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils/cn";
import type { SiteSearchResult } from "@/lib/data";
import type {
  IslandAnnouncement,
  IslandBrand,
  IslandEvent,
} from "../dynamic-island.types";
import {
  IslandAnnouncementCard,
  useUnreadAnnouncement,
} from "./announcement-activity";
import { IslandEventCard } from "./event-activity";
import styles from "../dynamic-island.module.css";

/** Rute ekstra di luar tab utama; label mengikuti kosakata tab yang sama. */
const EXTRA_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/buat", label: "Buat Pin" },
  { href: "/agenda", label: "Agenda" },
  { href: "/album", label: "Album" },
  { href: "/kilas-balik", label: "Kilas Balik" },
  { href: "/tersimpan", label: "Tersimpan" },
  { href: "/tentang", label: "Tentang" },
];

const KIND_ORDER: ReadonlyArray<SiteSearchResult["kind"]> = [
  "media",
  "blog",
  "member",
  "event",
  "album",
];

const KIND_LABEL: Record<SiteSearchResult["kind"], string> = {
  media: "Media",
  blog: "Artikel",
  member: "Anggota",
  album: "Album",
  event: "Agenda",
};

const KIND_ICON: Record<SiteSearchResult["kind"], LucideIcon> = {
  media: DESTINATION_ICONS["/galeri"],
  blog: DESTINATION_ICONS["/blog"],
  member: DESTINATION_ICONS["/anggota"],
  album: DESTINATION_ICONS["/album"],
  event: DESTINATION_ICONS["/agenda"],
};

type KindFilter = "all" | SiteSearchResult["kind"];

/** Quick panel hasil tap island: navigasi + kontrol cepat ala Live Activity iOS.
 *  Saat diketik, panel berubah jadi Spotlight — hasil instan lintas konten
 *  dengan dukungan navigasi panah keyboard dan penyaring kategori cepat. */
export function ExpandedRouteView({
  brand,
  event,
  announcement = null,
  onNavigate,
  autoFocusSearch = false,
}: {
  brand: IslandBrand;
  event: IslandEvent | null;
  announcement?: IslandAnnouncement | null;
  onNavigate: () => void;
  /** Dibuka dari tombol Cari/pintasan: kursor langsung di kolom Spotlight. */
  autoFocusSearch?: boolean;
}) {
  const pathname = usePathname();
  const { navigate } = useAppMotion();
  const { unread: hasUnreadAnnouncement } = useUnreadAnnouncement(announcement);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsListRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SiteSearchResult[]>([]);
  // Kata kunci yang hasilnya sedang ditampilkan. Selama berbeda dengan input
  // (debounce + request), panel menunjukkan kerangka — tidak pernah sempat
  // menampilkan "Tidak ada hasil" sebelum pencarian benar-benar berjalan.
  const [resultsFor, setResultsFor] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [selection, setSelection] = useState<{ key: string; index: number }>({
    key: "",
    index: 0,
  });

  const trimmed = query.trim();
  const spotlightActive = trimmed.length >= 2;
  const searching = spotlightActive && resultsFor !== trimmed;

  const rawResults = useMemo(
    () => (spotlightActive ? results : []),
    [results, spotlightActive],
  );

  const availableKinds = useMemo(() => {
    const counts = new Map<SiteSearchResult["kind"], number>();
    for (const item of rawResults) {
      counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
    }
    return KIND_ORDER.filter((kind) => (counts.get(kind) ?? 0) > 0).map((kind) => ({
      kind,
      count: counts.get(kind) ?? 0,
    }));
  }, [rawResults]);

  const effectiveKind: KindFilter =
    kindFilter !== "all" && availableKinds.some((entry) => entry.kind === kindFilter)
      ? kindFilter
      : "all";

  const visibleResults = useMemo(
    () =>
      effectiveKind === "all"
        ? rawResults
        : rawResults.filter((item) => item.kind === effectiveKind),
    [effectiveKind, rawResults],
  );

  const selectionScopeKey = `${trimmed}:${effectiveKind}`;
  const selectedIndex =
    selection.key === selectionScopeKey && visibleResults.length > 0
      ? Math.min(selection.index, visibleResults.length - 1)
      : 0;

  useEffect(() => {
    if (autoFocusSearch) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocusSearch]);

  // Debounce + abort: satu permintaan terakhir yang menang.
  useEffect(() => {
    if (!spotlightActive) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await requestJson<{ results?: SiteSearchResult[] }>(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
          "Pencarian gagal. Coba lagi sebentar.",
        );
        if (controller.signal.aborted) return;
        setResults(data.results ?? []);
        setSearchError(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchError(
          error instanceof ApiError
            ? error.message
            : "Tidak dapat terhubung. Periksa koneksi lalu coba lagi.",
        );
      }
      setResultsFor(trimmed);
    }, 220);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, spotlightActive]);

  function moveSelection(nextIndex: number) {
    if (visibleResults.length === 0) return;
    const clamped =
      ((nextIndex % visibleResults.length) + visibleResults.length) %
      visibleResults.length;
    setSelection({ key: selectionScopeKey, index: clamped });
    requestAnimationFrame(() => {
      const node = resultsListRef.current?.querySelector<HTMLElement>(
        `[data-result-index="${clamped}"]`,
      );
      node?.scrollIntoView({ block: "nearest" });
    });
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!spotlightActive || visibleResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(selectedIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(selectedIndex - 1);
    } else if (event.key === "Home" && event.ctrlKey) {
      event.preventDefault();
      moveSelection(0);
    } else if (event.key === "End" && event.ctrlKey) {
      event.preventDefault();
      moveSelection(visibleResults.length - 1);
    }
  }

  const links = [
    ...APP_TAB_ROUTES.map((tab) => ({
      href: tab.href,
      label: tab.id === "home" ? "Beranda" : tab.label,
      icon: destinationIcon(tab.href),
      active:
        tab.activeOnChildren && pathname !== "/"
          ? pathname.startsWith(tab.href)
          : pathname === tab.href,
    })),
    ...EXTRA_LINKS.map((link) => ({
      ...link,
      icon: destinationIcon(link.href),
      active: pathname === link.href,
    })),
  ];

  const activeOptionId =
    spotlightActive && visibleResults[selectedIndex]
      ? `spotlight-opt-${visibleResults[selectedIndex]!.kind}-${visibleResults[selectedIndex]!.id}`
      : undefined;

  return (
    <div className={styles.panel} role="dialog" aria-label="Panel cepat situs">
      <div className={styles.panelHeader}>
        <SiteLogo name={brand.siteName} url={brand.logoUrl} size={44} />
        <div className="min-w-0 flex-1">
          <p className={cn(styles.panelBrand, "font-display truncate")}>{brand.siteName}</p>
          {brand.tagline && <p className={styles.panelTagline}>{brand.tagline}</p>}
        </div>
      </div>

      {/* Spotlight: ketik untuk mencari media, artikel, anggota, album, dan agenda. */}
      <form
        className={styles.panelSearchForm}
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const chosen = visibleResults[selectedIndex] ?? visibleResults[0];
          if (chosen) {
            onNavigate();
            navigate(chosen.href);
          } else {
            inputRef.current?.blur();
          }
        }}
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Cari media, artikel, anggota, album, agenda…"
          aria-label="Cari di situs"
          aria-activedescendant={activeOptionId}
          aria-controls={spotlightActive ? "spotlight-results-list" : undefined}
          autoComplete="off"
          enterKeyHint="go"
          className={styles.panelSearchInput}
        />
        {!query && (
          <kbd
            aria-hidden="true"
            className="border-border text-muted hidden shrink-0 rounded-md border px-1.5 py-0.5 font-sans text-[10px] font-semibold pointer-fine:inline-block"
          >
            ⌘K
          </kbd>
        )}
      </form>

      {spotlightActive && availableKinds.length > 1 && (
        <div
          role="tablist"
          aria-label="Filter jenis hasil pencarian"
          className="no-scrollbar mb-2 flex shrink-0 items-center gap-1 overflow-x-auto px-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={effectiveKind === "all"}
            onClick={() => setKindFilter("all")}
            className={cn(
              styles.spotlightFilterChip,
              effectiveKind === "all" && styles.spotlightFilterChipActive,
            )}
          >
            Semua ({rawResults.length})
          </button>
          {availableKinds.map(({ kind, count }) => (
            <button
              key={kind}
              type="button"
              role="tab"
              aria-selected={effectiveKind === kind}
              onClick={() => setKindFilter(kind)}
              className={cn(
                styles.spotlightFilterChip,
                effectiveKind === kind && styles.spotlightFilterChipActive,
              )}
            >
              {KIND_LABEL[kind]} ({count})
            </button>
          ))}
        </div>
      )}

      <div className={styles.panelBody}>
        {!spotlightActive && announcement && (
          <IslandAnnouncementCard
            announcement={announcement}
            onNavigate={onNavigate}
          />
        )}
        {!spotlightActive && event && (
          <IslandEventCard event={event} onNavigate={onNavigate} />
        )}

        {spotlightActive ? (
          <div
            id="spotlight-results-list"
            ref={resultsListRef}
            role="listbox"
            aria-label="Hasil pencarian situs"
            className={cn(
              styles.panelResults,
              "transition-opacity",
              searching && visibleResults.length > 0 && "opacity-60",
            )}
            aria-live="polite"
            aria-busy={searching}
          >
            {searching && visibleResults.length === 0 ? (
              <SkeletonScreen label="Mencari…" className="space-y-1.5">
                {[0, 1, 2].map((index) => (
                  <Skeleton key={index} className="h-[3.1rem] rounded-2xl" style={skeletonWave(index)} />
                ))}
              </SkeletonScreen>
            ) : !searching && searchError ? (
              <p className="text-danger px-2 py-3 text-center text-sm">
                {searchError}
              </p>
            ) : !searching && visibleResults.length === 0 ? (
              <p className="text-muted px-2 py-3 text-center text-sm">
                Tidak ada hasil untuk “{trimmed}”.
              </p>
            ) : (
              visibleResults.map((result, idx) => {
                const KindIcon = KIND_ICON[result.kind];
                const selected = idx === selectedIndex;
                return (
                  <MotionLink
                    key={`${result.kind}-${result.id}`}
                    id={`spotlight-opt-${result.kind}-${result.id}`}
                    role="option"
                    aria-selected={selected}
                    data-result-index={idx}
                    href={result.href}
                    onMouseEnter={() =>
                      setSelection({ key: selectionScopeKey, index: idx })
                    }
                    onClick={onNavigate}
                    className={cn(
                      styles.panelResult,
                      selected && styles.panelResultSelected,
                    )}
                  >
                    <KindIcon className="size-4.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-muted block truncate text-xs font-medium">
                          {result.subtitle}
                        </span>
                      )}
                    </span>
                    <span className={styles.panelResultKind}>{KIND_LABEL[result.kind]}</span>
                  </MotionLink>
                );
              })
            )}
          </div>
        ) : (
          <nav className={styles.panelGrid} aria-label="Navigasi cepat">
            {links.map((link) => (
              <MotionLink
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                aria-current={link.active ? "page" : undefined}
                className={cn(
                  styles.panelLink,
                  link.active && styles.panelLinkActive,
                )}
              >
                <link.icon className="size-4.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{link.label}</span>
              </MotionLink>
            ))}
          </nav>
        )}
      </div>

      <div className={styles.panelControls}>
        <MusicQuickButton />
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          aria-label="Cari"
          className={iconButtonClass()}
        >
          <Search className="size-4.5" />
        </button>
        <MotionLink
          href="/notifikasi"
          onClick={onNavigate}
          aria-label={hasUnreadAnnouncement ? "Notifikasi baru" : "Notifikasi"}
          className={cn(iconButtonClass(), "relative")}
        >
          <Bell className="size-4.5" />
          {hasUnreadAnnouncement && (
            <span className={styles.bellDot} aria-hidden="true" />
          )}
        </MotionLink>
        <ThemeToggle />
      </div>
    </div>
  );
}
