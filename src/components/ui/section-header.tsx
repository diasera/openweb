import { ArrowRight } from "lucide-react";
import { MotionLink } from "@/components/motion";
import { cn } from "@/lib/utils/cn";

/**
 * Header section editorial: eyebrow kecil berwarna aksen (opsional), judul
 * Title 2 tebal dengan jumlah item, subjudul, dan kapsul aksi "Lihat semua"
 * yang memantulkan kilau saat hover. Dipakai tiap section beranda dan daftar.
 */
export function SectionHeader({
  title,
  subtitle,
  eyebrow,
  count,
  actionHref,
  actionLabel = "Lihat semua",
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
  /** id judul untuk aria-labelledby section pemanggil. */
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-primary-readable mb-1 text-caption1 font-semibold uppercase tracking-[0.14em]">
            {eyebrow}
          </p>
        )}
        <h2 id={id} className="flex items-baseline gap-2 text-title2 font-bold tracking-tight">
          <span className="min-w-0">{title}</span>
          {count !== undefined && count > 0 && (
            <span className="text-muted font-sans text-subhead font-semibold tabular-nums">
              {count}
            </span>
          )}
        </h2>
        {subtitle && <p className="text-muted mt-1 text-footnote">{subtitle}</p>}
      </div>
      {actionHref && (
        <MotionLink
          href={actionHref}
          prefetch={false}
          className="group/action motion-pressable motion-sheen bg-primary/10 text-primary-readable hover:bg-primary/15 relative inline-flex shrink-0 items-center gap-1 overflow-hidden rounded-full py-1.5 pl-3.5 pr-2.5 text-footnote font-semibold transition-colors"
        >
          {actionLabel}
          <ArrowRight
            className="size-3.5 transition-transform duration-300 ease-out group-hover/action:translate-x-0.5"
            aria-hidden="true"
          />
        </MotionLink>
      )}
    </div>
  );
}
