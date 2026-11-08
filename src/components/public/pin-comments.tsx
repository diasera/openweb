"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { RelativeTime } from "@/components/ui/relative-time";
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
 * gema otomatis tersaring keluar (dedupe konten). Kiriman yang gagal hanya
 * menghapus gemanya sendiri. SEO tetap utuh karena daftar awal dirender server.
 */
export function PinComments({
  mediaId,
  allowComments,
  initialComments,
  totalCount,
}: {
  mediaId: string;
  allowComments: boolean;
  /** Komentar terbaru (maks. COMMENT_DISPLAY_LIMIT), urut kronologis. */
  initialComments: PublicComment[];
  totalCount: number;
}) {
  const [echoes, setEchoes] = useState<EchoComment[]>([]);
  const mutation = usePublicTextMutation({
    endpoint: "/api/comments",
    payload: (content) => ({ media_id: mediaId, content }),
    successTitle: "Komentar terkirim",
    fallbackError: "Gagal mengirim komentar",
  });

  const visibleEchoes = echoes.filter(
    (echo) =>
      !initialComments.some((comment) => comment.content === echo.content),
  );
  const total = Math.max(totalCount, initialComments.length) + visibleEchoes.length;
  const hiddenOlder = totalCount - initialComments.length;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    const content = mutation.value.trim();
    const echoId = `echo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic = Boolean(content) && !mutation.pending;
    if (optimistic) {
      setEchoes((current) => [...current, { echoId, content }]);
    }
    const sent = await mutation.submit(event);
    if (optimistic && !sent) {
      setEchoes((current) => current.filter((echo) => echo.echoId !== echoId));
    }
  }

  return (
    <div className="mt-6">
      <h2 className="font-display mb-3 font-bold">
        Komentar <span className="text-muted font-normal">{total}</span>
      </h2>
      <div className="space-y-3">
        {hiddenOlder > 0 && (
          <p className="text-muted text-xs">
            Menampilkan {initialComments.length} komentar terbaru dari {totalCount}.
          </p>
        )}
        {initialComments.map((c) => (
          <div key={c.id} className="animate-rise flex gap-2.5">
            <Avatar name={c.author_name || "Anonim"} size={32} />
            <div className="min-w-0">
              <p className="text-sm">
                <span className="font-semibold">{c.author_name || "Anonim"}</span>{" "}
                <RelativeTime iso={c.created_at} className="text-muted text-xs" />
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
