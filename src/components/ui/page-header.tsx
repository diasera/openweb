import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Header halaman (h1) bersama publik & admin. `large` = Large Title iOS
 * (34/41 tebal) untuk halaman daftar publik dengan dukungan `eyebrow` editorial;
 * `default` untuk halaman pengelolaan Profil Admin.
 */
export function PageHeader({
  title,
  eyebrow,
  description,
  action,
  size = "default",
  className,
}: {
  title: string;
  /** Label mikro di atas judul untuk aksen editorial konsisten dengan SectionHeader. */
  eyebrow?: string;
  description?: ReactNode;
  action?: ReactNode;
  size?: "default" | "large";
  className?: string;
}) {
  const large = size === "large";
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-3",
        large ? "border-border/65 mb-6 border-b pb-5" : "mb-5",
        className,
      )}
    >
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
        <h1
          className={cn(
            "font-display tracking-tight text-balance",
            // Large Title iOS di ponsel, skala editorial tegas di layar lebar.
            large
              ? "text-large-title font-extrabold lg:text-[3rem] lg:leading-[1.08]"
              : "text-2xl font-bold",
          )}
        >
          {title}
        </h1>
        {description && (
          <p className={cn("text-muted mt-1.5 max-w-2xl", large ? "text-subhead" : "text-sm")}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
