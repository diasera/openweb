"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  House,
  Images,
  Info,
  LoaderCircle,
  Newspaper,
  Plus,
  Search,
  User,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/public/theme-toggle";
import { MusicQuickButton } from "@/components/public/music";
import { MotionLink } from "@/components/motion";
import { iconButtonClass } from "@/components/ui/icon-button";
import { APP_TAB_ROUTES } from "@/lib/navigation/app-routes";
import { cn } from "@/lib/utils/cn";
import type { SiteSearchResult } from "@/lib/data";
import type { IslandBrand } from "../dynamic-island.types";
import styles from "../dynamic-island.module.css";

const TAB_ICONS: Record<string, LucideIcon> = {
  home: House,
  gallery: Images,
  blog: Newspaper,
  profile: User,
};

/** Rute ekstra di luar tab utama; label mengikuti kosakata tab yang sama. */
const EXTRA_LINKS: ReadonlyArray<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/buat", label: "Buat Pin", icon: Plus },
  { href: "/tentang", label: "Tentang", icon: Info },
];

const KIND_LABEL: Record<SiteSearchResult["kind"], string> = {
  media: "Media",
  blog: "Artikel",
  member: "Anggota",
};

const KIND_ICON: Record<SiteSearchResult["kind"], LucideIcon> = {
  media: Images,
  blog: Newspaper,
  member: User,
};

/** Quick panel hasil tap island: navigasi + kontrol cepat ala Live Activity iOS.
 *  Saat diketik, panel berubah jadi Spotlight — hasil instan lintas konten. */
export function ExpandedRouteView({
  brand,
  onNavigate,
}: {
  brand: IslandBrand;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SiteSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const trimmed = query.trim();
  const spotlightActive = trimmed.length >= 2;
  // Saat kata kunci terlalu pendek, hasil lama disembunyikan lewat derive —
  // tidak perlu setState sinkron di effect.
  const visibleResults = spotlightActive ? results : [];

  // Debounce + abort: satu permintaan terakhir yang menang.
  useEffect(() => {
    if (!spotlightActive) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal },
        );
        const data = (await response.json()) as { results?: SiteSearchResult[] };
        setResults(data.results ?? []);
      } catch {
        /* dibatalkan atau gagal jaringan — biarkan hasil terakhir. */
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, spotlightActive]);

  const links = [    ...APP_TAB_ROUTES.map((tab) => ({
      href: tab.href,
      label: tab.id === "home" ? "Beranda" : tab.label,
      icon: TAB_ICONS[tab.id] ?? House,
      active:
        tab.activeOnChildren && pathname !== "/"
          ? pathname.startsWith(tab.href)
          : pathname === tab.href,
    })),
    ...EXTRA_LINKS.map((link) => ({
      ...link,
      active: pathname === link.href,
    })),
  ];

  return (
    <div className={styles.panel} role="dialog" aria-label="Panel cepat situs">
      <div className={styles.panelHeader}>
        {brand.logoUrl ? (
          <Image
            src={brand.logoUrl}
            alt={brand.siteName}
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span className="bg-foreground/10 grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-bold">
            {brand.siteName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className={styles.panelBrand}>{brand.siteName}</p>
          {brand.tagline && <p className={styles.panelTagline}>{brand.tagline}</p>}
        </div>
      </div>

      {/* Spotlight: ketik untuk mencari media, artikel, dan anggota. */}
      <form
        className={styles.panelSearchForm}
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const first = visibleResults[0];
          if (first) {
            onNavigate();
            router.push(first.href);
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
          placeholder="Cari media, artikel, anggota…"
          aria-label="Cari di situs"
          autoComplete="off"
          enterKeyHint="go"
          className={styles.panelSearchInput}
        />
        {searching && (
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
        )}
      </form>

      {spotlightActive ? (
        <div className={styles.panelResults} aria-live="polite">
          {!searching && visibleResults.length === 0 ? (
            <p className="text-muted px-2 py-3 text-center text-sm">
              Tidak ada hasil untuk “{trimmed}”.
            </p>
          ) : (
            visibleResults.map((result) => {
              const KindIcon = KIND_ICON[result.kind];
              return (
                <MotionLink
                  key={`${result.kind}-${result.id}`}
                  href={result.href}
                  prefetch={false}
                  onClick={onNavigate}
                  className={styles.panelResult}
                >
                  <KindIcon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
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
              prefetch={false}
              onClick={onNavigate}
              aria-current={link.active ? "page" : undefined}
              className={cn(
                styles.panelLink,
                link.active && styles.panelLinkActive,
              )}
            >
              <link.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="truncate">{link.label}</span>
            </MotionLink>
          ))}
        </nav>
      )}

      <div className={styles.panelControls}>
        <MusicQuickButton />
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          aria-label="Cari"
          className={iconButtonClass()}
        >
          <Search className="h-[18px] w-[18px]" />
        </button>
        <MotionLink
          href="/notifikasi"
          onClick={onNavigate}
          aria-label="Notifikasi"
          className={iconButtonClass()}
        >
          <Bell className="h-[18px] w-[18px]" />
        </MotionLink>
        <ThemeToggle />
      </div>
    </div>
  );
}
