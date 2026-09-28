import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { gradientCss } from "@/lib/utils/color";

/**
 * Placeholder saat data kosong, meniru ContentUnavailableView iOS: ikon di
 * plat yang mengambang pelan dalam 3D di tengah halo konsentris warna tema,
 * judul Title 3, deskripsi sekunder, aksi opsional. Dipakai bagian publik dan
 * pengelolaan admin.
 */
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
        "flex flex-col items-center px-6 py-10 text-center",
        className,
      )}
    >
      {icon && (
        <div aria-hidden="true" className="relative mb-4 grid size-32 place-items-center">
          <span className="bg-primary/10 absolute size-20 rounded-full blur-2xl" />
          <span className="border-primary/12 absolute size-24 rounded-[2rem] border" />
          <span className="border-primary/6 absolute inset-0 rounded-[2.5rem] border" />
          <div
            className="motion-float border-border bg-surface text-primary-readable shadow-elevated relative grid size-18 place-items-center rounded-3xl border"
            style={{ background: gradientCss(title, 160) }}
          >
            {icon}
          </div>
        </div>
      )}
      <p className="font-display text-title3 font-semibold">{title}</p>
      {description && (
        <p className="text-muted mt-1.5 max-w-xs text-subhead text-balance">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
