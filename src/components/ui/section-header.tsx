import { MotionLink } from "@/components/motion";
import { cn } from "@/lib/utils/cn";

/** Header section: judul + link "Lihat semua" (opsional). Dipakai tiap section beranda. */
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
      <div>
        <h2 className="text-xl font-bold leading-tight">{title}</h2>
        {subtitle && <p className="text-muted mt-0.5 text-[13px]">{subtitle}</p>}
      </div>
      {actionHref && (
        <MotionLink
          href={actionHref}
          prefetch={false}
          className="text-primary-readable shrink-0 text-sm font-semibold"
        >
          {actionLabel}
        </MotionLink>
      )}
    </div>
  );
}
