"use client";

import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useAdminAction } from "@/components/admin/use-admin-action";
import type { ActionResult } from "@/lib/action-result";
import { hasPreparingImageDraft } from "@/lib/hooks/use-image-draft";

const DEFAULT_PREPARING_MESSAGE = "Tunggu sampai gambar selesai disiapkan.";

interface AdminFormActionOptions {
  action: (formData: FormData) => Promise<ActionResult>;
  successMessage: string;
  requestErrorMessage: string;
  successDescription?: string;
  preparingMessage?: string;
  onStart?: () => void;
  onError?: (message: string) => void;
  onSuccess?: (form: HTMLFormElement) => void;
}

/**
 * Controller submit bersama untuk form admin berbasis Server Action.
 * Callback hanya menangani state lokal form; guard, feedback, dan refresh
 * tetap konsisten dari satu tempat (useAdminAction).
 */
export function useAdminFormAction({
  action,
  successMessage,
  requestErrorMessage,
  successDescription,
  preparingMessage = DEFAULT_PREPARING_MESSAGE,
  onStart,
  onError,
  onSuccess,
}: AdminFormActionOptions) {
  const router = useRouter();
  const { toast } = useToast();
  const { pending, run } = useAdminAction();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (hasPreparingImageDraft(form)) {
      onError?.(preparingMessage);
      toast.error(preparingMessage);
      return;
    }

    const formData = new FormData(form);
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
