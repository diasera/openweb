"use client";

import { useId, type FormEvent, type ReactNode, type RefObject } from "react";
import { Save } from "lucide-react";
import { useIslandActions } from "@/components/public/dynamic-island";
import { useSaveShortcut } from "@/lib/hooks/use-save-shortcut";
import { IslandSaveButton } from "../island-save";

/**
 * Cangkang form per-tab Pengaturan. Tombol Simpan muncul di Dynamic Island
 * hanya selama ada perubahan; setelah tersimpan island kembali normal.
 * Ctrl/⌘+S menyimpan tab yang sedang terbuka.
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
  const formId = useId();
  useSaveShortcut(() => formRef.current?.requestSubmit());
  useIslandActions(
    dirty || pending
      ? {
          actions: (
            <IslandSaveButton
              type="submit"
              form={formId}
              pending={pending}
              icon={<Save className="size-4" aria-hidden="true" />}
            >
              {pending ? "Menyimpan…" : "Simpan"}
            </IslandSaveButton>
          ),
        }
      : null,
  );

  return (
    <form id={formId} ref={formRef} onSubmit={onSubmit} noValidate className="space-y-5">
      {children}
    </form>
  );
}
