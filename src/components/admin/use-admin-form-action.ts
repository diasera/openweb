"use client";

import { useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { getActionError, type ActionResult } from "@/lib/action-result";
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
 * tetap konsisten dari satu tempat.
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
  const [pending, startTransition] = useTransition();

  function reportError(message: string) {
    onError?.(message);
    toast.error(message);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (hasPreparingImageDraft(form)) {
      reportError(preparingMessage);
      return;
    }

    const formData = new FormData(form);
    onStart?.();
    startTransition(async () => {
      try {
        const result = await action(formData);
        const actionError = getActionError(result);
        if (actionError) {
          reportError(actionError);
          return;
        }

        onSuccess?.(form);
        toast.success(
          successMessage,
          successDescription ? { description: successDescription } : undefined,
        );
        router.refresh();
      } catch {
        reportError(requestErrorMessage);
      }
    });
  }

  return { onSubmit, pending };
}
