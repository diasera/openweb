import type { CSSProperties, ReactNode } from "react";
import { staggerDelay } from "@/components/motion/stagger";
import { cardClass } from "@/components/ui/card";
import { Masonry } from "@/components/ui/masonry";
import { cn } from "@/lib/utils/cn";

/**
 * Otak kerangka pemuatan. Semua loading konten (route, daftar, pratinjau
 * yang sedang diproses) dirangkai dari blok di file ini, gaya visualnya dari
 * `.motion-skeleton` (motion.css). Tanpa hook dan tanpa JS animasi, jadi bisa
 * dirender server maupun klien dan tetap ringan.
 */

/** Gelombang kilau menurun: baris/kartu ke-i mulai sedikit lebih lambat. */
export function skeletonWave(index: number): CSSProperties {
  return { "--skeleton-delay": staggerDelay(index, 90, 12) ?? "0ms" } as CSSProperties;
}

/** Satu "tulang": ukuran & radius diatur lewat className. */
export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" className={cn("motion-skeleton block", className)} style={style} />;
}

const LINE_WIDTHS = ["w-full", "w-11/12", "w-4/5", "w-full", "w-3/4"] as const;

/** Paragraf: baris terakhir lebih pendek seperti teks sungguhan. */
export function SkeletonText({
  lines = 3,
  className,
  lineClassName = "h-3.5",
}: {
  lines?: number;
  className?: string;
  lineClassName?: string;
}) {
  return (
    <span aria-hidden="true" className={cn("block space-y-2.5", className)}>
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "rounded-md",
            lineClassName,
            lines > 1 && index === lines - 1 ? "w-3/5" : LINE_WIDTHS[index % LINE_WIDTHS.length],
          )}
        />
      ))}
    </span>
  );
}

/**
 * Kepala halaman: `page` = PageHeader large (halaman publik), `admin` =
 * plat ikon + judul AdminPage. Ukuran mengikuti teks aslinya agar tidak loncat.
 */
export function SkeletonHeader({ variant = "page" }: { variant?: "page" | "admin" }) {
  if (variant === "admin") {
    return (
      <div className="mb-6 flex items-center gap-3.5">
        <Skeleton className="size-12 shrink-0 rounded-2xl sm:size-13" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-4 w-72 max-w-full rounded-md" />
        </div>
      </div>
    );
  }
  return (
    <div className="mb-6 space-y-2.5">
      <Skeleton className="h-9 w-52 rounded-xl lg:h-12 lg:w-72" />
      <Skeleton className="h-4 w-80 max-w-full rounded-md" />
    </div>
  );
}

/** Judul bagian (eyebrow + judul) di atas rail/grid beranda. */
export function SkeletonSectionTitle() {
  return (
    <div className="mb-3 space-y-2">
      <Skeleton className="h-3 w-16 rounded-md" />
      <Skeleton className="h-6 w-40 rounded-lg" />
    </div>
  );
}

/** Deretan pil (tab filter, chip kategori). */
export function SkeletonPills({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("flex gap-2 overflow-hidden", className)}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={cn("h-9 shrink-0 rounded-full", index === 0 ? "w-24" : "w-20")} />
      ))}
    </div>
  );
}

/** Daftar baris kartu (artikel, notifikasi, acara, daftar admin). */
export function SkeletonRows({
  count = 6,
  leading = "tile",
  trailing = true,
}: {
  count?: number;
  leading?: "tile" | "wide" | "avatar" | "none";
  trailing?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className={cardClass("flat", "flex items-center gap-3 rounded-card p-3.5")}
          style={{ ...skeletonWave(index), opacity: 1 - index * 0.1 }}
        >
          {leading !== "none" && (
            <Skeleton
              className={cn(
                "shrink-0",
                leading === "avatar" && "size-11 rounded-full",
                leading === "tile" && "size-11 rounded-xl",
                leading === "wide" && "size-20 rounded-xl",
              )}
            />
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5 rounded-md" />
            <Skeleton className="h-3 w-2/5 rounded-md" />
          </div>
          {trailing && <Skeleton className="size-9 shrink-0 rounded-xl" />}
        </div>
      ))}
    </div>
  );
}

const MASONRY_RATIOS = ["3 / 4", "1 / 1", "4 / 5", "2 / 3", "1 / 1", "3 / 4"] as const;

/** Grid masonry pin (galeri, album, tersimpan) memakai Masonry yang sama. */
export function SkeletonMasonry({ count = 8 }: { count?: number }) {
  return (
    <Masonry>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} style={skeletonWave(index)}>
          <Skeleton
            className="rounded-pin w-full"
            style={{ aspectRatio: MASONRY_RATIOS[index % MASONRY_RATIOS.length] }}
          />
        </div>
      ))}
    </Masonry>
  );
}

/** Grid kartu ber-gambar + keterangan (album, anggota, moderasi media). */
export function SkeletonCards({
  count = 8,
  media = "aspect-4/3 rounded-card",
  className = "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  lines = 2,
}: {
  count?: number;
  /** Kelas bentuk gambar, mis. "aspect-square rounded-full" untuk avatar. */
  media?: string;
  className?: string;
  lines?: 0 | 1 | 2;
}) {
  return (
    <div className={cn("grid gap-x-3 gap-y-5", className)}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-2.5" style={skeletonWave(index)}>
          <Skeleton className={cn("w-full", media)} />
          {lines > 0 && <Skeleton className="h-4 w-3/4 rounded-md" />}
          {lines > 1 && <Skeleton className="h-3 w-1/2 rounded-md" />}
        </div>
      ))}
    </div>
  );
}

/** Rail horizontal: avatar bulat (anggota) atau kartu tegak (kenangan). */
export function SkeletonRail({ count = 6, shape = "avatar" }: { count?: number; shape?: "avatar" | "card" }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex shrink-0 flex-col items-center gap-2" style={skeletonWave(index)}>
          <Skeleton className={shape === "avatar" ? "size-16 rounded-full" : "aspect-3/4 w-32 rounded-card"} />
          {shape === "avatar" && <Skeleton className="h-3 w-14 rounded-md" />}
        </div>
      ))}
    </div>
  );
}

/** Field form (label + kontrol) untuk editor dan pengaturan. */
export function SkeletonFields({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-2" style={skeletonWave(index)}>
          <Skeleton className="h-3.5 w-24 rounded-md" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

/** Editor teks kaya: bilah alat lalu badan tulisan (editor artikel). */
export function SkeletonEditor() {
  return (
    <div className={cardClass("elevated", "overflow-hidden rounded-card")}>
      <Skeleton className="h-12 rounded-none" />
      <div className="min-h-[22rem] space-y-6 p-5">
        <SkeletonText lines={4} />
        <SkeletonText lines={3} />
      </div>
    </div>
  );
}

/** Kartu bagian form (FormSection) berisi field. */
export function SkeletonPanel({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <div className={cardClass("flat", cn("space-y-5 rounded-card p-5", className))}>
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 shrink-0 rounded-2xl" />
        <Skeleton className="h-5 w-32 rounded-md" />
      </div>
      <SkeletonFields count={fields} />
    </div>
  );
}

/**
 * Lapisan "sedang diproses" di atas pratinjau (HEIC → JPEG, unduh foto asli):
 * kilau skeleton menutupi area, label opsional menjelaskan prosesnya. Tanpa
 * label (mis. thumbnail) lapisan hanya visual agar tidak mengumumkan ganda.
 */
export function SkeletonOverlay({ label, className }: { label?: string; className?: string }) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-hidden={label ? undefined : true}
      className={cn("motion-skeleton absolute inset-0 z-10 grid place-items-center", className)}
    >
      {label && (
        <span className="glass relative z-10 rounded-full px-3 py-1.5 text-caption1 font-semibold">
          {label}
        </span>
      )}
    </span>
  );
}

/** Pembungkus satu layar kerangka: diumumkan sekali ke pembaca layar. */
export function SkeletonScreen({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" className={cn("motion-skeleton-screen", className)}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}
