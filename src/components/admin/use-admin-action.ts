"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { getActionError } from "@/lib/action-result";

export interface AdminActionFeedback {
  successMessage?: string;
  successDescription?: string;
  /** Pesan saat request gagal total (jaringan putus/aksi melempar). */
  errorMessage: string;
  onSuccess?: () => void;
  /** Dipanggil untuk galat ActionResult maupun request yang gagal. */
  onError?: (message: string) => void;
}

/**
 * Satu pintu menjalankan Server Action admin: transition pending, galat
 * ActionResult, exception jaringan, toast, dan callback state lokal.
 * Exception WAJIB ditangkap di sini: di React 19 galat dalam transition
 * async diteruskan ke error boundary dan merobohkan seluruh halaman admin.
 */
export function useAdminAction() {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  /** Callback milik pemanggil pun dijaga dengan alasan yang sama. */
  function runCallback(callback: (() => void) | undefined) {
    try {
      callback?.();
    } catch (cause) {
      console.error("[admin-action] callback gagal", cause);
      toast.error("Tampilan belum diperbarui. Muat ulang halaman.");
    }
  }

  function run(action: () => Promise<unknown>, feedback: AdminActionFeedback) {
    startTransition(async () => {
      let error: string | null;
      try {
        error = getActionError(await action());
      } catch {
        error = feedback.errorMessage;
      }
      if (error) {
        const message = error;
        runCallback(() => feedback.onError?.(message));
        toast.error(message);
        return;
      }
      runCallback(feedback.onSuccess);
      if (feedback.successMessage) {
        toast.success(
          feedback.successMessage,
          feedback.successDescription
            ? { description: feedback.successDescription }
            : undefined,
        );
      }
    });
  }

  return { pending, run };
}
