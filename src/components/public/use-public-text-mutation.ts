"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { postJson } from "@/lib/api/client";

interface PublicTextMutationOptions {
  endpoint: string;
  payload: (content: string) => unknown;
  successTitle: string;
  successDescription?: string;
  successNote?: string;
  fallbackError: string;
}

/** State dan alur kirim bersama untuk composer teks publik. */
export function usePublicTextMutation(options: PublicTextMutationOptions) {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");
  const [hasError, setHasError] = useState(false);

  /** Resolve `true` bila terkirim, `false` bila ditolak/gagal (untuk rollback optimistis). */
  async function submit(event: FormEvent<HTMLFormElement>): Promise<boolean> {
    event.preventDefault();
    const content = value.trim();
    if (!content || pending) return false;

    setPending(true);
    setNote("");
    setHasError(false);
    try {
      await postJson(
        options.endpoint,
        options.payload(content),
        options.fallbackError,
      );
      setValue("");
      setNote(options.successNote ?? "");
      toast.success(options.successTitle, {
        description: options.successDescription,
      });
      router.refresh();
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : options.fallbackError;
      setHasError(true);
      setNote(message);
      toast.error(message);
      return false;
    } finally {
      setPending(false);
    }
  }

  return { value, setValue, pending, note, hasError, submit };
}
