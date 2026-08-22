"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { timeAgo } from "@/lib/utils/time";
import { InlineTextComposer } from "./inline-text-composer";
import { usePublicTextMutation } from "./use-public-text-mutation";
import type { PublicComment } from "@/lib/data";

/** Komentar sementara yang menunggu konfirmasi server. */
interface EchoComment {
  echoId: string;
  content: string;
}

/**
 * Komentar + komposer dalam satu seksi. Kiriman baru muncul seketika
 * sebagai gema "Mengirim…"; setelah refresh server memuat komentar asli,
 * gema otomatis tersarikan keluar (dedupe konten) — tanpa efek samping
 * ganda. SEO tetap utuh karena daftar awal dirender server.
 */
export function PinComments({
  mediaId,
  allowComments,
  initialComments,
}: {
  mediaId: string;
  allowComments: boolean;
  initialComments: PublicComment[];
}) {
  const [echoes, setEchoes] = useState<EchoComment[]>([]);
  const mutation = usePublicTextMutation({
    endpoint: "/api/comments",
    payload: (content) => ({ media_id: mediaId, content }),
    successTitle: "Komentar terkirim",
    fallbackError: "Gagal mengirim komentar",
  });

  // Gagal kirim → buang gema terakhir (penyesuaian state saat render,
  // pola resmi React pengganti setState-in-effect).
  if (mutation.hasError && echoes.length > 0) {
    setEchoes((current) => current.slice(0, -1));
  }

  const visibleEchoes = echoes.filter(
    (echo) =>
      !initialComments.some((comment) => comment.content === echo.content),
  );
  const total = initialComments.length + visibleEchoes.length;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    const content = mutation.value.trim();
    if (content && !mutation.pending) {
      setEchoes((current) => [
        ...current,
        { echoId: `echo-${Date.now()}`, content },
      ]);
    }
    return mutation.submit(event);
  }

  return (
    <div className="mt-6">
      <h2 className="font-display mb-3 font-bold">
        Komentar <span className="text-muted font-normal">{total}</span>
      </h2>
      <div className="space-y-3">
        {initialComments.map((c) => (
          <div key={c.id} className="animate-rise flex gap-2.5">
            <Avatar name={c.author_name || "Anonim"} size={32} />
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-semibold">{c.author_name || "Anonim"}</span>{" "}
                <span className="text-muted text-xs">{timeAgo(c.created_at)}</span>
              </p>
              <p className="text-sm">{c.content}</p>
            </div>
          </div>
        ))}

        {visibleEchoes.map((echo) => (
          <div key={echo.echoId} className="animate-rise flex gap-2.5 opacity-70">
            <Avatar name="Kamu" size={32} />
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-semibold">Kamu</span>{" "}
                <span className="text-muted text-xs">Mengirim…</span>
              </p>
              <p className="text-sm">{echo.content}</p>
            </div>
          </div>
        ))}

        {total === 0 && (
          <p className="text-muted text-sm">
            Belum ada komentar. Jadilah yang pertama!
          </p>
        )}
      </div>

      {allowComments && (
        <div className="mt-4">
          <InlineTextComposer
            value={mutation.value}
            onValueChange={mutation.setValue}
            onSubmit={submit}
            pending={mutation.pending}
            placeholder="Tambahkan komentar…"
            note={mutation.note}
            hasError={mutation.hasError}
            submitIcon={<Send className="h-4 w-4" aria-hidden="true" />}
            submitAriaLabel="Kirim komentar"
          />
        </div>
      )}
    </div>
  );
}
