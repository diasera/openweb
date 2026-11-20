"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowUpDown, CornerDownRight, Send, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { fieldClass } from "@/components/ui/input";
import { RelativeTime } from "@/components/ui/relative-time";
import { InlineTextComposer } from "./inline-text-composer";
import { usePublicTextMutation } from "./use-public-text-mutation";
import type { PublicComment } from "@/lib/data";
import { readStorage, STORAGE_KEYS, writeStorage } from "@/lib/utils/storage";
import { cn } from "@/lib/utils/cn";

/** Komentar sementara yang menunggu konfirmasi server. */
interface EchoComment {
  echoId: string;
  authorName: string;
  content: string;
}

type CommentSort = "oldest" | "newest";

/**
 * Komentar + komposer dalam satu seksi. Mendukung nama tampilan opsional
 * (tersimpan lokal di browser), tombol balas `@Nama`, urutan Terbaru/Terlama,
 * penghitung karakter mendekati 500, serta gema optimistik saat mengirim.
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [echoes, setEchoes] = useState<EchoComment[]>([]);
  const [sort, setSort] = useState<CommentSort>("oldest");
  const [authorName, setAuthorName] = useState(
    () => readStorage(STORAGE_KEYS.commentAuthorName) ?? "",
  );
  const [showNameField, setShowNameField] = useState(() =>
    Boolean(readStorage(STORAGE_KEYS.commentAuthorName)?.trim()),
  );

  const mutation = usePublicTextMutation({
    endpoint: "/api/comments",
    payload: (content) => ({
      media_id: mediaId,
      content,
      ...(authorName.trim() ? { author_name: authorName.trim() } : {}),
    }),
    successTitle: "Komentar terkirim",
    fallbackError: "Gagal mengirim komentar",
  });

  const visibleEchoes = echoes.filter(
    (echo) =>
      !initialComments.some(
        (comment) =>
          comment.content === echo.content &&
          (comment.author_name || "Anonim") ===
            (echo.authorName || "Anonim"),
      ),
  );
  const total =
    Math.max(totalCount, initialComments.length) + visibleEchoes.length;
  const hiddenOlder = totalCount - initialComments.length;

  const sortedComments = useMemo(
    () =>
      sort === "newest" ? [...initialComments].reverse() : initialComments,
    [initialComments, sort],
  );

  function updateAuthorName(next: string) {
    const trimmed = next.slice(0, 60);
    setAuthorName(trimmed);
    writeStorage(STORAGE_KEYS.commentAuthorName, trimmed.trim());
  }

  function startReply(name: string) {
    const handle = `@${name} `;
    const nextValue = mutation.value.startsWith(handle)
      ? mutation.value
      : `${handle}${mutation.value}`;
    mutation.setValue(nextValue.slice(0, 500));
    inputRef.current?.focus();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    const content = mutation.value.trim();
    const displayAuthor = authorName.trim() || "Anonim";
    const echoId = `echo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic = Boolean(content) && !mutation.pending;
    if (optimistic) {
      setEchoes((current) => [
        ...current,
        { echoId, authorName: displayAuthor, content },
      ]);
    }
    const sent = await mutation.submit(event);
    if (optimistic && !sent) {
      setEchoes((current) => current.filter((echo) => echo.echoId !== echoId));
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display font-bold">
          Komentar <span className="text-muted font-normal">{total}</span>
        </h2>
        {initialComments.length >= 2 && (
          <button
            type="button"
            onClick={() =>
              setSort((prev) => (prev === "oldest" ? "newest" : "oldest"))
            }
            className="text-muted hover:text-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors"
          >
            <ArrowUpDown className="size-3.5" aria-hidden="true" />
            {sort === "newest" ? "Terbaru" : "Terlama"}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {hiddenOlder > 0 && (
          <p className="text-muted text-xs">
            Menampilkan {initialComments.length} komentar terbaru dari{" "}
            {totalCount}.
          </p>
        )}

        {sort === "newest" &&
          visibleEchoes.map((echo) => (
            <div
              key={echo.echoId}
              className="animate-rise flex gap-2.5 opacity-70"
            >
              <Avatar name={echo.authorName} size={32} />
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-semibold">{echo.authorName}</span>{" "}
                  <span className="text-muted text-xs">Mengirim…</span>
                </p>
                <p className="text-sm">{echo.content}</p>
              </div>
            </div>
          ))}

        {sortedComments.map((c) => {
          const name = c.author_name || "Anonim";
          return (
            <div key={c.id} className="animate-rise group flex gap-2.5">
              <Avatar name={name} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
                  <span className="font-semibold">{name}</span>
                  <RelativeTime
                    iso={c.created_at}
                    className="text-muted text-xs"
                  />
                  {allowComments && (
                    <button
                      type="button"
                      onClick={() => startReply(name)}
                      className="text-muted hover:text-primary-readable inline-flex items-center gap-0.5 text-[0.7rem] font-semibold transition-colors"
                    >
                      <CornerDownRight
                        className="size-3"
                        aria-hidden="true"
                      />
                      Balas
                    </button>
                  )}
                </div>
                <p className="mt-0.5 break-words text-sm leading-relaxed">
                  {c.content}
                </p>
              </div>
            </div>
          );
        })}

        {sort === "oldest" &&
          visibleEchoes.map((echo) => (
            <div
              key={echo.echoId}
              className="animate-rise flex gap-2.5 opacity-70"
            >
              <Avatar name={echo.authorName} size={32} />
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-semibold">{echo.authorName}</span>{" "}
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
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <button
              type="button"
              onClick={() => setShowNameField((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-semibold transition-colors",
                authorName.trim()
                  ? "text-primary-readable"
                  : "text-muted hover:text-foreground",
              )}
            >
              <UserRound className="size-3.5" aria-hidden="true" />
              {authorName.trim()
                ? `Sebagai: ${authorName.trim()}`
                : showNameField
                  ? "Kirim sebagai Anonim"
                  : "Pakai nama tampilan (opsional)"}
            </button>
          </div>

          {showNameField && (
            <input
              type="text"
              value={authorName}
              onChange={(event) => updateAuthorName(event.target.value)}
              placeholder="Nama kamu (kosongkan untuk Anonim)"
              aria-label="Nama tampilan komentar"
              maxLength={60}
              className={fieldClass(
                "self",
                "w-full rounded-full px-3.5 py-2 text-xs",
              )}
            />
          )}

          <InlineTextComposer
            inputRef={inputRef}
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
