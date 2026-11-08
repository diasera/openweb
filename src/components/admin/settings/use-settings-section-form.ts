"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useFormDirty } from "@/lib/hooks/use-form-dirty";
import type { ActionResult } from "@/lib/action-result";
import {
  validateSiteSection,
  type SiteSettingsSection,
} from "@/lib/site-config/schema";
import { useAdminFormAction } from "../use-admin-form-action";

/**
 * Komposisi form satu tab Pengaturan: validasi zod inline per-field (skema
 * yang sama dengan server), pelacak perubahan + guard beforeunload, dan
 * submit lewat useAdminFormAction. Satu pusat untuk keempat tab.
 */
export function useSettingsSectionForm(
  section: SiteSettingsSection,
  action: (formData: FormData) => Promise<ActionResult>,
  successMessage: string,
  onDirtyChange?: (dirty: boolean) => void,
) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const { dirty, setDirty } = useFormDirty(formRef);

  const { onSubmit, pending } = useAdminFormAction({
    action,
    successMessage,
    successDescription: "Halaman publik diperbarui otomatis.",
    requestErrorMessage: "Koneksi terputus saat menyimpan pengaturan. Coba lagi.",
    onSuccess: () => setDirty(false),
  });

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const errors = validateSiteSection(section, new FormData(event.currentTarget));
    setFieldErrors(errors ?? {});
    if (errors) {
      event.preventDefault();
      // Bawa admin ke field pertama yang salah.
      const first = Object.keys(errors)[0];
      if (first) {
        const escaped = CSS.escape(first);
        event.currentTarget
          .querySelector<HTMLElement>(`#${escaped}, [name="${escaped}"]:not([type="hidden"])`)
          ?.focus();
      }
      return;
    }
    onSubmit(event);
  }

  return { formRef, dirty, handleSubmit, pending, fieldErrors };
}
