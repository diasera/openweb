"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAdminFormAction } from "@/components/admin/use-admin-form-action";
import { useFormDirty } from "@/lib/hooks/use-form-dirty";
import type { ActionResult } from "@/lib/action-result";
import {
  validateSiteSection,
  type SiteSettingsSection,
} from "@/lib/site-config/schema";

/**
 * Komposisi form satu tab Setting: validasi zod inline per-field (skema yang
 * sama dengan server), dirty tracking + guard beforeunload, dan submit lewat
 * useAdminFormAction. Satu pusat untuk keempat section.
 */
export function useSettingsSectionForm(
  section: SiteSettingsSection,
  action: (formData: FormData) => Promise<ActionResult>,
  successMessage: string,
  options?: { onDirtyChange?: (dirty: boolean) => void },
) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const { dirty, setDirty } = useFormDirty(formRef);
  const onDirtyChange = options?.onDirtyChange;

  const { onSubmit, pending } = useAdminFormAction({
    action,
    successMessage,
    requestErrorMessage:
      "Koneksi terputus saat menyimpan pengaturan. Coba lagi.",
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
      return;
    }
    onSubmit(event);
  }

  return { formRef, dirty, handleSubmit, pending, fieldErrors };
}
