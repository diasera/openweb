"use client";

import { Pause, Play, Quote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RelativeTime } from "@/components/ui/relative-time";
import { useToast } from "@/components/ui/toast";
import { useMusic } from "@/components/public/music";
import { MusicBars } from "@/components/public/music/music-bars";
import type { PublicMessage } from "@/lib/data";
import { parseSongfessContent } from "@/lib/messages/songfess";
import { cn } from "@/lib/utils/cn";
import { pastelTint } from "@/lib/utils/color";
import { formatSiteDate } from "@/lib/utils/time";
import { MessageLike } from "./message-like";
import { StoryShareButton } from "./story-share-button";

/**
 * Kartu pesan anonim bergaya Editorial Note Card: tint lembut adaptif tema,
 * aksen kutipan tipis, kapsul pemutar Songfess langsung ke Dynamic Island,
 * tombol suka, dan ekspor Kartu Story 9:16.
 */
export function MessageCard({ message }: { message: PublicMessage }) {
  const music = useMusic();
  const { toast } = useToast();
  const parsed = parseSongfessContent(message.content);
  const attachedTrack = parsed.trackId
    ? music.tracks.find((item) => item.id === parsed.trackId) ?? null
    : null;
  const isThisTrackPlaying =
    Boolean(attachedTrack) &&
    music.enabled &&
    music.isPlaying &&
    music.currentTrack?.id === attachedTrack?.id;

  const songLabel = attachedTrack
    ? `${attachedTrack.title}${attachedTrack.artist ? ` — ${attachedTrack.artist}` : ""}`
    : null;

  function handlePlaySongfess() {
    if (!attachedTrack) return;
    void music.playTrackById(attachedTrack.id).catch((error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Lagu tidak dapat diputar.",
      );
    });
  }

  const textLength = parsed.text.length;
  const textScaleClass =
    textLength <= 90
      ? "font-display text-headline font-semibold leading-snug tracking-tight sm:text-title3"
      : textLength <= 200
        ? "text-subhead font-medium leading-relaxed"
        : "text-footnote leading-relaxed";

  return (
    <Card
      variant="elevated"
      data-spotlight
      className="relative overflow-hidden border-foreground/[0.08] p-4 dark:border-white/[0.08]"
      style={{ backgroundColor: pastelTint(message.id) }}
    >
      <Quote
        aria-hidden="true"
        className="text-foreground/[0.06] pointer-events-none absolute right-3 top-3 size-9 dark:text-white/[0.07]"
      />

      <p
        className={cn(
          "text-foreground relative pr-7 whitespace-pre-line wrap-break-word",
          textScaleClass,
        )}
      >
        {parsed.text}
      </p>

      {attachedTrack && (
        <button
          type="button"
          onClick={handlePlaySongfess}
          aria-label={
            isThisTrackPlaying
              ? `Jeda lagu ${attachedTrack.title}`
              : `Putar lagu ${attachedTrack.title}`
          }
          className="motion-pressable border-foreground/10 bg-surface/72 hover:bg-surface/90 relative mt-3 flex w-full items-center gap-2.5 rounded-2xl border px-2.5 py-2 text-left backdrop-blur-md transition-colors"
        >
          <span className="bg-primary text-primary-foreground grid size-7 shrink-0 place-items-center rounded-full shadow-2xs">
            {isThisTrackPlaying ? (
              <Pause className="size-3.5 fill-current" aria-hidden="true" />
            ) : (
              <Play className="ml-0.5 size-3.5 fill-current" aria-hidden="true" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-foreground block truncate text-xs font-semibold">
              {attachedTrack.title}
            </span>
            <span className="text-muted block truncate text-[11px]">
              {attachedTrack.artist || "Songfess"}
            </span>
          </span>
          {isThisTrackPlaying && (
            <MusicBars
              playing
              className="text-primary-readable shrink-0 scale-75"
            />
          )}
        </button>
      )}

      <div className="border-foreground/[0.07] text-muted relative mt-3 flex items-center justify-between gap-2 border-t pt-2.5 text-caption2 dark:border-white/[0.07]">
        <RelativeTime iso={message.created_at} />
        <div className="flex items-center gap-1">
          <StoryShareButton
            spec={{
              kind: "quote",
              siteName: music.siteName,
              text: parsed.text,
              songLabel,
              dateLabel: formatSiteDate(message.created_at),
              filename: `pesan-${message.id.slice(0, 8)}`,
            }}
          />
          <MessageLike id={message.id} likes={message.likes} />
        </div>
      </div>
    </Card>
  );
}
