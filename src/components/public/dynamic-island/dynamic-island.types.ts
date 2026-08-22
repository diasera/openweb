import type { ReactNode } from "react";
import type { FeedbackStatus } from "@/lib/feedback/types";

/** Isi dasar island yang mengikuti halaman publik aktif. */
export type IslandRouteConfig =
  | { variant: "main"; siteName: string; logoUrl?: string | null }
  | {
      variant: "sub";
      title: string;
      right?: ReactNode;
      backHref?: string;
      close?: boolean;
    }
  | { variant: "title"; title: string; right?: ReactNode };

/** Identitas situs untuk quick panel hasil tap island. */
export interface IslandBrand {
  siteName: string;
  logoUrl?: string | null;
  tagline?: string | null;
}

/** Seluruh chrome aplikasi didaftarkan sekaligus agar hanya ada satu pemilik. */
export interface PageChromeConfig {
  island: IslandRouteConfig;
  tabBarVisible: boolean;
  notificationPromptVisible: boolean;
  profileTabLabel?: "Profil" | "Admin";
}

/** Override opsional dari halaman; nilai final tetap disusun pemilik global. */
export type PageChromeRegistration = Partial<PageChromeConfig>;

export type IslandNoticeStatus = FeedbackStatus;

/** Aktivitas singkat berprioritas di atas tampilan halaman. */
export interface IslandNotice {
  id: string;
  status: IslandNoticeStatus;
  title: string;
  description?: string;
}

export type IslandNoticeInput = Omit<IslandNotice, "id"> & {
  /** Kosong berarti bertahan sampai di-update atau ditutup manual. */
  duration?: number;
};

export type IslandNoticePatch = Partial<Omit<IslandNotice, "id">> & {
  duration?: number;
};
