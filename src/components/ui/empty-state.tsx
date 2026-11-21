import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { gradientCss } from "@/lib/utils/color";

/**
 * Placeholder saat data kosong, meniru ContentUnavailableView iOS: ikon di
 * plat yang mengambang pelan dalam 3D di tengah halo konsentris warna tema,
 * judul Title 3, deskripsi sekunder, aksi opsional. Dipakai bagian publik dan
 * pengelolaan admin.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Varian ringkas untuk hasil pencarian/filter kosong di dalam daftar. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        compact ? "px-4 py-8" : "px-6 py-12",
        className,
      )}
    >
      {icon && (
        <div
          aria-hidden="true"
          className={cn(
            "relative grid place-items-center",
            compact ? "mb-3 size-22" : "mb-5 size-32",
          )}
        >
          <span
            className={cn(
              "bg-primary/14 absolute rounded-full blur-2xl",
              compact ? "size-14" : "size-22",
            )}
          />
          <span
            className={cn(
              "border-primary/16 absolute border",
              compact ? "size-17 rounded-[1.35rem]" : "size-24 rounded-[2rem]",
            )}
          />
          {!compact && (
            <span className="border-primary/8 absolute inset-0 rounded-[2.5rem] border" />
          )}
          <div
            className={cn(
              "motion-float border-border/80 bg-surface text-primary-readable shadow-elevated relative grid place-items-center border ring-1 ring-inset ring-white/35 dark:ring-white/10",
              compact ? "size-13 rounded-2xl" : "size-18 rounded-3xl",
            )}
            style={{ background: gradientCss(title, 160) }}
          >
            {icon}
          </div>
        </div>
      )}
      <p
        className={cn(
          "font-display font-bold tracking-tight",
          compact ? "text-headline" : "text-title3",
        )}
      >
        {title}
      </p>
      {description && (
        <p
          className={cn(
            "text-muted mt-1.5 max-w-xs text-balance",
            compact ? "text-footnote" : "text-subhead",
          )}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
