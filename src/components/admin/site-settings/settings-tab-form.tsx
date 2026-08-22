"use client";

import { Save } from "lucide-react";
import type { FormEvent, ReactNode, RefObject } from "react";
import { Button } from "@/components/ui/button";

/**
 * Cangkang presentasional form per-tab Setting: chip "belum disimpan" dan
 * tombol simpan sticky di atas tab-bar mobile. State form (validasi inline,
 * dirty tracking) dimiliki useSettingsSectionForm milik section.
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
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      {children}
      <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex items-center justify-end gap-3 py-2 md:bottom-4">
        {dirty && (
          <span className="text-muted bg-surface-2 rounded-full px-3 py-1 text-xs font-medium">
            Belum disimpan
          </span>
        )}
        <Button type="submit" disabled={pending} className="shadow-ios">
          <Save className="h-4 w-4" aria-hidden="true" />
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
    </form>
  );
}
