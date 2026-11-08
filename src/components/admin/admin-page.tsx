import type { ReactNode } from "react";
import type { AdminFeature } from "@/lib/constants";
import { KineticWords, blurDelay } from "@/components/motion";
import { cn } from "@/lib/utils/cn";
import { ADMIN_FEATURE_PRESENTATION } from "./features";

const WIDTHS = {
  full: "",
  wide: "mx-auto max-w-4xl",
  narrow: "mx-auto max-w-2xl",
} as const;

/**
 * Kerangka setiap halaman admin: plat ikon fitur, judul yang masuk per kata,
 * deskripsi, aksi utama, baris toolbar (filter/tab), lalu isi. Satu struktur
 * untuk semua child view sehingga hierarki visual dan jarak selalu sama.
 */
export function AdminPage({
  feature,
  title,
  description,
  actions,
  toolbar,
  width = "full",
  children,
}: {
  feature?: AdminFeature;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  width?: keyof typeof WIDTHS;
  children: ReactNode;
}) {
  const presentation = feature ? ADMIN_FEATURE_PRESENTATION[feature] : null;
  const Icon = presentation?.icon;

  return (
    <div className={WIDTHS[width]}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3.5">
          {Icon && presentation && (
            <span
              aria-hidden="true"
              className={cn(
                "gloss animate-control-pop grid size-12 shrink-0 place-items-center rounded-2xl sm:size-13",
                presentation.plate,
              )}
            >
              <Icon className="size-6" strokeWidth={2.1} />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-title1 font-bold tracking-tight sm:text-large-title">
              <KineticWords text={title} />
            </h1>
            {description && (
              <p
                className="text-muted motion-blur-in mt-1 max-w-2xl text-sm leading-relaxed"
                style={blurDelay(120)}
              >
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="motion-blur-in flex shrink-0 flex-wrap items-center gap-2" style={blurDelay(180)}>
            {actions}
          </div>
        )}
      </header>
      {toolbar && <div className="mb-5">{toolbar}</div>}
      {children}
    </div>
  );
}
