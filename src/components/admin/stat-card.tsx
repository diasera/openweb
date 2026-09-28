import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Card } from "@/components/ui/card";

/** Kartu statistik admin (label + angka besar + ikon). Reusable. */
export function StatCard({
  label,
  value,
  icon,
  hint,
  iconClass,
}: {
  label: string;
  value: number | string;
  icon?: ReactNode;
  hint?: string;
  iconClass?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <span className="text-muted text-sm">{label}</span>
        {icon && (
          <span className={cn("text-muted", iconClass)} aria-hidden>
            {icon}
          </span>
        )}
      </div>
      <p className="font-display mt-2 text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className="text-muted mt-1 text-xs">{hint}</p>}
    </Card>
  );
}
