import { ChevronRight } from "lucide-react";
import { MotionLink } from "@/components/motion";
import { cn } from "@/lib/utils/cn";

/**
 * Header section ala App Store: judul Title 2 tebal + kapsul "Lihat semua"
 * berwarna aksen (opsional). Dipakai tiap section beranda dan daftar.
 */
export function SectionHeader({
  title,
  subtitle,
  actionHref,
  actionLabel = "Lihat semua",
  className,
}: {
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-title2 font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-muted mt-0.5 text-footnote">{subtitle}</p>}
      </div>
      {actionHref && (
        <MotionLink
          href={actionHref}
          prefetch={false}
          className="group/action motion-pressable bg-primary/10 text-primary-readable hover:bg-primary/15 inline-flex shrink-0 items-center gap-0.5 rounded-full py-1.5 pl-3 pr-2 text-footnote font-semibold transition-colors"
        >
          {actionLabel}
          <ChevronRight
            className="size-4 transition-transform duration-200 ease-out group-hover/action:translate-x-0.5"
            aria-hidden="true"
          />
        </MotionLink>
      )}
    </div>
  );
}
