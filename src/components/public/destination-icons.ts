import {
  BookImage,
  Bookmark,
  CalendarDays,
  CircleUserRound,
  House,
  Images,
  Info,
  MessagesSquare,
  Newspaper,
  Plus,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

/**
 * Satu glyph per tujuan navigasi. Tab bar, panel cepat Dynamic Island, menu
 * Profil, hasil Spotlight, dan navigasi admin membaca peta yang sama sehingga
 * Galeri/Blog/Anggota tidak lagi tampil dengan ikon berbeda antar-permukaan.
 */
export const DESTINATION_ICONS = {
  "/": House,
  "/galeri": Images,
  "/blog": Newspaper,
  "/profil": CircleUserRound,
  "/buat": Plus,
  "/agenda": CalendarDays,
  "/album": BookImage,
  "/tersimpan": Bookmark,
  "/pesan": MessagesSquare,
  "/anggota": UsersRound,
  "/tentang": Info,
  "/privasi": ShieldCheck,
} as const satisfies Record<string, LucideIcon>;

export type Destination = keyof typeof DESTINATION_ICONS;

/** Ikon untuk href dari registry rute (bertipe string); rute asing jatuh ke Beranda. */
export function destinationIcon(href: string): LucideIcon {
  return href in DESTINATION_ICONS
    ? DESTINATION_ICONS[href as Destination]
    : DESTINATION_ICONS["/"];
}
