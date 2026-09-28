"use client";

import { InlineTextComposer } from "./inline-text-composer";
import { usePublicTextMutation } from "./use-public-text-mutation";

/** Input kirim pesan anonim -> POST /api/pesan (IP & device ditangkap di server). */
export function MessageComposer() {
  const mutation = usePublicTextMutation({
    endpoint: "/api/pesan",
    payload: (content) => ({ content }),
    successTitle: "Pesan terkirim",
    successDescription: "Pesanmu sudah masuk.",
    successNote: "Terkirim! Pesanmu sudah masuk.",
    fallbackError: "Gagal mengirim pesan",
  });

  return (
    <InlineTextComposer
      value={mutation.value}
      onValueChange={mutation.setValue}
      onSubmit={mutation.submit}
      pending={mutation.pending}
      placeholder="Tulis pesan anonim…"
      note={mutation.note}
      hasError={mutation.hasError}
    />
  );
}
