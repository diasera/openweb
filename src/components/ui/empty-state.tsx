import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Placeholder saat data kosong. Dipakai bagian publik dan pengelolaan admin. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border flex flex-col items-center rounded-ios border border-dashed px-6 py-10 text-center",
        className,
      )}
    >
      {icon && <div className="text-muted mb-3">{icon}</div>}
      <p className="font-semibold">{title}</p>
      {description && <p className="text-muted mt-1 max-w-xs text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
