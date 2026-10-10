"use client";

import type { FormEvent, ReactNode, RefObject } from "react";
import { CircleCheck, LoaderCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Cangkang form per-tab Pengaturan: isi section, lalu bilah simpan kaca yang
 * mengambang di atas tab bar. Bilah menyala (aksen) saat ada perubahan yang
 * belum disimpan dan tenang saat semua tersimpan.
 */
export function SettingsTabForm({
  formRef,
  dirty,
  onSubmit,
  pending,
  children,
}: {
  formRef: RefObject<HTMLFormElement | null>;
  dirty: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5">
      {children}
      <div className="sticky bottom-[calc(5.75rem+var(--safe-bottom))] z-20 flex justify-end md:bottom-5">
        <div
          className={cn(
            "glass-material flex items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5 shadow-[var(--shadow-glass-strong)] transition-colors",
            dirty && "border-primary/40",
          )}
        >
          <span className="flex items-center gap-1.5 text-caption1 font-semibold" aria-live="polite">
            {dirty ? (
              <>
                <span className="motion-live-dot text-warning size-1.5" aria-hidden="true" />
                Belum disimpan
              </>
            ) : (
              <>
                <CircleCheck className="text-success size-4" aria-hidden="true" />
                <span className="text-muted">Tersimpan</span>
              </>
            )}
          </span>
          <Button type="submit" size="sm" disabled={pending} className="motion-sheen relative overflow-hidden">
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {pending ? "Menyimpan…" : "Simpan"}
          </Button>
        </div>
      </div>
    </form>
  );
}
