"use client";

import { useState } from "react";
import { Music2, X } from "lucide-react";
import { useMusic } from "@/components/public/music";
import { MAX_SONGFESS_TEXT_LENGTH } from "@/lib/messages/songfess";
import { cn } from "@/lib/utils/cn";
import { InlineTextComposer } from "./inline-text-composer";
import { usePublicTextMutation } from "./use-public-text-mutation";

/** Input kirim pesan anonim (beserta pemilih lagu Songfess bila playlist tersedia). */
export function MessageComposer({
  successNote = "Terkirim! Pesanmu sudah masuk.",
}: {
  /** Catatan di bawah input setelah terkirim, mis. menjelaskan pesan perlu dipin admin. */
  successNote?: string;
}) {
  const music = useMusic();
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedTrack =
    selectedTrackId !== null
      ? music.tracks.find((track) => track.id === selectedTrackId) ?? null
      : null;

  const mutation = usePublicTextMutation({
    endpoint: "/api/pesan",
    payload: (content) => ({
      content,
      ...(selectedTrack ? { trackId: selectedTrack.id } : {}),
    }),
    successTitle: selectedTrack ? "Songfess terkirim" : "Pesan terkirim",
    successDescription: selectedTrack
      ? `Pesanmu dengan lagu "${selectedTrack.title}" sudah masuk.`
      : "Pesanmu sudah masuk.",
    successNote,
    fallbackError: "Gagal mengirim pesan",
    onSuccess: () => {
      setSelectedTrackId(null);
      setPickerOpen(false);
    },
  });

  return (
    <div className="space-y-2">
      <InlineTextComposer
        value={mutation.value}
        onValueChange={(next) =>
          mutation.setValue(
            selectedTrack ? next.slice(0, MAX_SONGFESS_TEXT_LENGTH) : next,
          )
        }
        onSubmit={mutation.submit}
        pending={mutation.pending}
        placeholder={
          selectedTrack
            ? `Tulis pesan untuk lagu ${selectedTrack.title}…`
            : "Tulis pesan anonim…"
        }
        note={mutation.note}
        hasError={mutation.hasError}
      />

      {music.tracks.length > 0 && (
        <div className="px-1">
          {selectedTrack ? (
            <div className="bg-primary/10 text-primary-readable inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pl-2.5 pr-1.5 text-caption1 font-semibold">
              <Music2 className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                {selectedTrack.title}
                {selectedTrack.artist ? ` — ${selectedTrack.artist}` : ""}
              </span>
              <button
                type="button"
                aria-label="Lepas lampiran lagu"
                onClick={() => setSelectedTrackId(null)}
                className="hover:bg-primary/15 grid size-5 shrink-0 place-items-center rounded-full"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-expanded={pickerOpen}
              onClick={() => setPickerOpen((open) => !open)}
              className={cn(
                "motion-pressable inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption1 font-semibold transition-colors",
                pickerOpen
                  ? "bg-primary/12 text-primary-readable"
                  : "bg-surface-2 text-muted hover:text-foreground",
              )}
            >
              <Music2 className="size-3.5" aria-hidden="true" />
              Sematkan lagu (Songfess)
            </button>
          )}

          {pickerOpen && !selectedTrack && (
            <div
              role="listbox"
              aria-label="Pilih lagu untuk Songfess"
              className="border-border bg-surface shadow-soft animate-fade-in mt-2 max-h-44 space-y-1 overflow-y-auto rounded-2xl border p-1.5"
            >
              {music.tracks.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    setSelectedTrackId(track.id);
                    setPickerOpen(false);
                    if (mutation.value.length > MAX_SONGFESS_TEXT_LENGTH) {
                      mutation.setValue(
                        mutation.value.slice(0, MAX_SONGFESS_TEXT_LENGTH),
                      );
                    }
                  }}
                  className="hover:bg-surface-2 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors"
                >
                  <Music2
                    className="text-primary-readable size-3.75 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">
                      {track.title}
                    </span>
                    {track.artist && (
                      <span className="text-muted block truncate text-caption2">
                        {track.artist}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
