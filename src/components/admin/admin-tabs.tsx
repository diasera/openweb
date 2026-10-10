import Link from "next/link";
import type { MouseEvent } from "react";
import { cn } from "@/lib/utils/cn";

export interface AdminTabItem {
  label: string;
  value: string;
  count?: number;
}

/**
 * Tab filter berbasis URL (?status=…) untuk daftar admin. Pil aktif memakai
 * view-transition-name tetap, jadi saat filter berganti pil "meluncur" ke tab
 * baru lewat View Transition di root layout — tanpa JS animasi. Link tidak
 * menggulir ke atas agar posisi baca tetap. Komponen ini tanpa hook, jadi
 * bisa dipakai Server maupun Client Component (Pengaturan memasang
 * `onSelect` untuk menjaga perubahan yang belum disimpan).
 */
export function AdminTabs({
  basePath,
  param = "status",
  active,
  items,
  label = "Filter",
  onSelect,
}: {
  basePath: string;
  param?: string;
  active: string;
  items: readonly AdminTabItem[];
  label?: string;
  onSelect?: (value: string, href: string, event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  return (
    <nav aria-label={label} className="no-scrollbar -mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
      <div className="bg-surface-2/80 border-border/60 inline-flex min-w-max gap-1 rounded-full border p-1">
        {items.map((item) => {
          const isActive = item.value === active;
          const href = `${basePath}?${param}=${encodeURIComponent(item.value)}`;
          return (
            <Link
              key={item.value}
              href={href}
              scroll={false}
              onClick={onSelect ? (event) => onSelect(item.value, href, event) : undefined}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "motion-pressable relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                isActive ? "text-foreground" : "text-muted hover:text-foreground",
              )}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="bg-surface shadow-soft absolute inset-0 rounded-full dark:bg-[rgb(var(--surface-elevated))]"
                  style={{ viewTransitionName: "admin-tab-indicator" }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                {item.label}
                {item.count !== undefined && (
                  <span
                    className={cn(
                      "min-w-5 rounded-full px-1.5 text-center text-caption2 font-semibold tabular-nums",
                      isActive ? "bg-primary/12 text-primary-readable" : "bg-surface/80",
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
