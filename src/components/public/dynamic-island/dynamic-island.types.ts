import type { ReactNode } from "react";
import type { FeedbackStatus } from "@/lib/feedback/types";
import type { EventRow } from "@/lib/types/database";

/** Isi dasar island yang mengikuti halaman publik aktif. */
export type IslandRouteConfig =
  | { variant: "main"; siteName: string; logoUrl?: string | null }
  | ({
      variant: "sub";
      title: string;
      right?: ReactNode;
      backHref?: string;
      close?: boolean;
    } & Partial<IslandPageActions>)
  | { variant: "title"; title: string; right?: ReactNode };

/**
 * Aksi milik halaman yang sedang tampil (mis. Simpan di editor). Island
 * multifungsi dengan prioritas: selama aksi terpasang island hanya memuat
 * Kembali, judul, aksi ini, dan tombol musik bila lagu sedang diputar —
 * aksi kanan bawaan route (mis. sakelar tema) disembunyikan. Halaman
 * memasangnya hanya saat ada yang perlu disimpan, jadi island kembali
 * normal sendiri setelah tersimpan.
 */
export interface IslandPageActions {
  actions: ReactNode;
}

/** Identitas situs untuk quick panel hasil tap island. */
export interface IslandBrand {
  siteName: string;
  logoUrl?: string | null;
  tagline?: string | null;
}

/** Acara terdekat untuk Live Activity hitung mundur di island. */
export type IslandEvent = Pick<EventRow, "id" | "title" | "starts_at" | "ends_at" | "location">;

/** Cara quick panel dibuka; `focusSearch` langsung menyiapkan Spotlight. */
export interface IslandExpandOptions {
  focusSearch?: boolean;
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
