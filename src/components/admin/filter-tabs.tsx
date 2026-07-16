import Link from "next/link";
import { cn } from "@/lib/utils/cn";

/** Tab filter berbasis URL untuk menu pengelolaan Media, Blog, dan lainnya. */
export function FilterTabs({
  basePath,
  param = "status",
  active,
  items,
}: {
  basePath: string;
  param?: string;
  active: string;
  items: { label: string; value: string }[];
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {items.map((it) => {
        const href = it.value ? `${basePath}?${param}=${it.value}` : basePath;
        const isActive = active === it.value;
        return (
          <Link
            key={it.value}
            href={href}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
              isActive
                ? "bg-foreground border-foreground text-bg"
                : "border-border text-foreground/70 hover:bg-surface-2",
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
