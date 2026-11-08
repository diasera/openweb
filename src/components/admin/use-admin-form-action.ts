"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useAdminAction } from "./use-admin-action";
import type { ActionResult } from "@/lib/action-result";
import { hasPreparingImageDraft } from "@/lib/hooks/use-image-draft";

const DEFAULT_PREPARING_MESSAGE = "Tunggu sampai gambar selesai disiapkan.";

export interface AdminFormActionOptions {
  action: (formData: FormData) => Promise<ActionResult>;
  successMessage: string;
  requestErrorMessage: string;
  successDescription?: string;
  preparingMessage?: string;
  /** Validasi klien sebelum dikirim; kembalikan pesan untuk membatalkan. */
  validate?: (formData: FormData, form: HTMLFormElement) => string | null;
  onStart?: () => void;
  onError?: (message: string) => void;
  onSuccess?: (form: HTMLFormElement) => void;
}

/**
 * Controller submit bersama untuk seluruh form admin berbasis Server Action:
 * tunggu editor gambar, validasi opsional, kirim lewat useAdminAction, lalu
 * segarkan data server. Callback hanya mengurus state lokal form.
 */
export function useAdminFormAction({
  action,
  successMessage,
  requestErrorMessage,
  successDescription,
  preparingMessage = DEFAULT_PREPARING_MESSAGE,
  validate,
  onStart,
  onError,
  onSuccess,
}: AdminFormActionOptions) {
  const router = useRouter();
  const { toast } = useToast();
  const { pending, run } = useAdminAction();

  function reject(message: string) {
    onError?.(message);
    toast.error(message);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (hasPreparingImageDraft(form)) {
      reject(preparingMessage);
      return;
    }

    const formData = new FormData(form);
    const invalid = validate?.(formData, form);
    if (invalid) {
      reject(invalid);
      return;
    }

    onStart?.();
    run(() => action(formData), {
      successMessage,
      successDescription,
      errorMessage: requestErrorMessage,
      onError,
      onSuccess: () => {
        onSuccess?.(form);
        router.refresh();
      },
    });
  }

  return { onSubmit, pending };
}
