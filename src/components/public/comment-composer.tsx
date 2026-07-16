"use client";

import { Send } from "lucide-react";
import { InlineTextComposer } from "./inline-text-composer";
import { usePublicTextMutation } from "./use-public-text-mutation";

/** Input tambah komentar -> POST /api/comments, lalu refresh daftar. */
export function CommentComposer({ mediaId }: { mediaId: string }) {
  const mutation = usePublicTextMutation({
    endpoint: "/api/comments",
    payload: (content) => ({ media_id: mediaId, content }),
    successTitle: "Komentar terkirim",
    fallbackError: "Gagal mengirim komentar",
  });

  return (
    <InlineTextComposer
      value={mutation.value}
      onValueChange={mutation.setValue}
      onSubmit={mutation.submit}
      pending={mutation.pending}
      placeholder="Tambahkan komentar…"
      note={mutation.note}
      hasError={mutation.hasError}
      submitIcon={<Send className="h-4 w-4" aria-hidden="true" />}
      submitAriaLabel="Kirim komentar"
    />
  );
}
