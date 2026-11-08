import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { MotionLink } from "@/components/motion";
import { cardClass } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { cn } from "@/lib/utils/cn";

/**
 * Ubin angka dasbor: plat ikon, angka yang menghitung naik (CSS), label, dan
 * petunjuk. Dengan `href` ubin menjadi tautan bersorot tepi (spotlight);
 * `urgent` menambah titik berdenyut untuk antrean yang menunggu tindakan.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  plate,
  href,
  urgent = false,
  className,
}: {
  label: string;
  value: number;
  hint?: string;
  icon: LucideIcon;
  /** Kelas tone plat ikon dari ADMIN_FEATURE_PRESENTATION. */
  plate: string;
  href?: string;
  urgent?: boolean;
  className?: string;
}) {
  const body = (
    <>
      <div className="relative flex items-start justify-between gap-2">
        <span className={cn("gloss grid size-9 place-items-center rounded-xl", plate)} aria-hidden="true">
          <Icon className="size-4.5" strokeWidth={2.2} />
        </span>
        {urgent ? (
          <span className="text-primary-readable flex items-center gap-1.5 text-caption2 font-semibold">
            <span className="motion-live-dot size-1.5" aria-hidden="true" />
            Perlu ditinjau
          </span>
        ) : (
          href && (
            <ArrowUpRight
              className="text-muted size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          )
        )}
      </div>
      <p className="font-display relative mt-4 text-title1 font-bold leading-none tracking-tight sm:text-[2rem]">
        <CountUp value={value} />
      </p>
      <p className="relative mt-1.5 text-footnote font-semibold">{label}</p>
      {hint && <p className="text-muted relative mt-0.5 truncate text-caption1">{hint}</p>}
    </>
  );

  const surface = cardClass(
    href ? "interactive" : "elevated",
    cn(
      "group relative flex flex-col overflow-hidden p-4",
      urgent && "border-primary/30",
      className,
    ),
  );

  return href ? (
    <MotionLink href={href} data-spotlight className={surface}>
      {body}
    </MotionLink>
  ) : (
    <div className={surface}>{body}</div>
  );
}
