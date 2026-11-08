import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { listReveal } from "@/components/motion";
import { cardClass } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

/**
 * Daftar admin satu bentuk untuk pesan, anggota, artikel, acara, album,
 * komentar, pengunjung, notifikasi, akun admin, dan playlist: elemen depan,
 * judul + badge, isi opsional, metadata, lalu klaster aksi. Baris pertama
 * masuk berurutan; sisanya bangkit saat digulir (listReveal).
 */
export function AdminList({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul aria-label={label} className={cn("space-y-2.5", className)}>
      {children}
    </ul>
  );
}

export function AdminRow({
  index = 0,
  leading,
  title,
  badges,
  meta,
  actions,
  highlight = false,
  align = "center",
  children,
}: {
  index?: number;
  leading?: ReactNode;
  title?: ReactNode;
  badges?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  /** Baris yang perlu perhatian (pesan baru): tepi aksen + tint lembut. */
  highlight?: boolean;
  align?: "center" | "start";
  children?: ReactNode;
}) {
  const reveal = listReveal(index);
  return (
    <li className={reveal.className} style={reveal.style}>
      <article
        className={cardClass(
          "elevated",
          cn(
            "relative flex gap-3 overflow-hidden p-3 sm:p-3.5",
            align === "center" ? "items-center" : "items-start",
            highlight && "border-primary/30 bg-primary/[0.035]",
          ),
        )}
      >
        {highlight && (
          <span aria-hidden="true" className="bg-primary absolute inset-y-3 left-0 w-1 rounded-r-full" />
        )}
        {leading && <div className="shrink-0">{leading}</div>}
        <div className="min-w-0 flex-1">
          {title && (
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <p className="min-w-0 truncate font-semibold">{title}</p>
              {badges}
            </div>
          )}
          {children && <div className={title ? "mt-1" : undefined}>{children}</div>}
          {meta && <div className="text-muted mt-1 truncate text-xs">{meta}</div>}
        </div>
        {actions && <div className="-mr-1 flex shrink-0 items-center gap-0.5">{actions}</div>}
      </article>
    </li>
  );
}

const BADGE_TONES = {
  primary: "bg-primary/12 text-primary-readable",
  neutral: "bg-surface-2 text-muted",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  danger: "bg-danger/12 text-danger",
  outline: "border border-border text-muted",
} as const;

export type BadgeTone = keyof typeof BADGE_TONES;

/** Badge status kecil (Terbit, Draf, Diblokir, Baru, Owner, …). */
export function StatusBadge({
  tone = "neutral",
  live = false,
  children,
}: {
  tone?: BadgeTone;
  /** Titik berdenyut untuk status yang menunggu tindakan. */
  live?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-caption2 font-semibold",
        BADGE_TONES[tone],
      )}
    >
      {live && <span className="motion-live-dot size-1.5" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Ubin ikon di depan baris (album, lagu, notifikasi). */
export function LeadingIcon({
  icon: Icon,
  className = "bg-surface-2 text-muted",
  wide = false,
}: {
  icon: LucideIcon;
  /** Kelas warna (latar + teks) tone. */
  className?: string;
  /** Rasio 16:11 selebar thumbnail cover artikel. */
  wide?: boolean;
}) {
  return (
    <span
      className={cn("grid place-items-center rounded-xl", wide ? "h-11 w-16" : "size-11", className)}
      aria-hidden="true"
    >
      <Icon className="size-5" />
    </span>
  );
}

/** Ubin tanggal ala ikon Kalender (acara). */
export function LeadingDate({
  day,
  month,
  muted = false,
}: {
  day: string;
  month: string;
  muted?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className="border-border bg-surface w-12 overflow-hidden rounded-xl border text-center leading-none shadow-soft"
    >
      <span
        className={cn(
          "block py-0.5 text-caption2 font-bold uppercase",
          muted ? "bg-surface-2 text-muted" : "gloss bg-primary text-primary-foreground",
        )}
      >
        {month}
      </span>
      <span className={cn("block py-1.5 text-lg font-bold", muted && "text-muted")}>{day}</span>
    </span>
  );
}
