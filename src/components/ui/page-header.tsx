import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Header halaman (h1) bersama publik & admin. `large` = Large Title iOS
 * (34/41 tebal) untuk halaman daftar publik; `default` untuk halaman
 * pengelolaan Profil Admin.
 */
export function PageHeader({
  title,
  description,
  action,
  size = "default",
  className,
}: {
  title: string;
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
        large ? "mb-6" : "mb-5",
        className,
      )}
    >
      <div className="min-w-0">
        <h1
          className={cn(
            "font-display font-bold text-balance",
            // Large Title iOS di ponsel, skala editorial di layar lebar.
            large ? "text-large-title lg:text-display" : "text-2xl",
          )}
        >
          {title}
        </h1>
        {description && (
          <p className={cn("text-muted mt-1", large ? "text-subhead" : "text-sm")}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
