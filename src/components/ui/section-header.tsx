import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { MotionLink } from "@/components/motion";
import { cn } from "@/lib/utils/cn";

/**
 * Header section editorial: eyebrow kecil berwarna aksen (opsional), judul
 * Title 2 tebal dengan jumlah item, subjudul, dan kapsul aksi "Lihat semua"
 * atau slot aksi kustom. Dipakai tiap section beranda dan daftar.
 */
export function SectionHeader({
  title,
  subtitle,
  eyebrow,
  count,
  actionHref,
  actionLabel = "Lihat semua",
  action,
  id,
  className,
}: {
  title: string;
  subtitle?: string;
  /** Label kecil di atas judul, mis. "Komunitas". */
  eyebrow?: string;
  /** Jumlah item di samping judul (tampil bila > 0). */
  count?: number;
  actionHref?: string;
  actionLabel?: string;
  /** Slot aksi kustom bila section perlu lebih dari satu kontrol. */
  action?: ReactNode;
  /** id judul untuk aria-labelledby section pemanggil. */
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-primary-readable mb-1.5 inline-flex items-center gap-2 text-caption1 font-semibold uppercase tracking-[0.14em]">
            <span
              className="bg-primary inline-block h-[2px] w-3.5 shrink-0 rounded-full"
              aria-hidden="true"
            />
            <span>{eyebrow}</span>
          </p>
        )}
        <h2
          id={id}
          className="flex flex-wrap items-center gap-2 text-title2 font-extrabold tracking-tight sm:text-title1"
        >
          <span className="min-w-0">{title}</span>
          {count !== undefined && count > 0 && (
            <>
              <span className="sr-only">{" "}</span>
              <span className="border-border/80 bg-surface-2/90 text-muted inline-flex items-center rounded-full border px-2 py-0.5 font-sans text-caption2 font-semibold tabular-nums">
                {count}
              </span>
            </>
          )}
        </h2>
        {subtitle && <p className="text-muted mt-1 text-footnote">{subtitle}</p>}
      </div>
      {action ? (
        <div className="shrink-0">{action}</div>
      ) : (
        actionHref && (
          <MotionLink
            href={actionHref}
            prefetch={false}
            className="group/action motion-pressable motion-sheen border-primary/20 bg-primary/10 text-primary-readable hover:border-primary/30 hover:bg-primary/15 relative inline-flex shrink-0 items-center gap-1 overflow-hidden rounded-full border py-1.5 pl-3.5 pr-2.5 text-footnote font-semibold transition-colors"
          >
            {actionLabel}
            <ArrowRight
              className="size-3.5 transition-transform duration-300 ease-out group-hover/action:translate-x-0.5"
              aria-hidden="true"
            />
          </MotionLink>
        )
      )}
    </div>
  );
}
