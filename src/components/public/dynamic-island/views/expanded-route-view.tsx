"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Bell,
  House,
  Images,
  Info,
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

/** Quick panel hasil tap island: navigasi + kontrol cepat ala Live Activity iOS. */
export function ExpandedRouteView({
  brand,
  onNavigate,
}: {
  brand: IslandBrand;
  onNavigate: () => void;
}) {
  const pathname = usePathname();

  const links = [
    ...APP_TAB_ROUTES.map((tab) => ({
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

      <div className={styles.panelControls}>
        <MusicQuickButton />
        <MotionLink
          href="/galeri"
          prefetch={false}
          onClick={onNavigate}
          aria-label="Cari"
          className={iconButtonClass()}
        >
          <Search className="h-[18px] w-[18px]" />
        </MotionLink>
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
