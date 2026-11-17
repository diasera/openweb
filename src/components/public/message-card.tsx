"use client";

import { Pause, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RelativeTime } from "@/components/ui/relative-time";
import { useToast } from "@/components/ui/toast";
import { useMusic } from "@/components/public/music";
import { MusicBars } from "@/components/public/music/music-bars";
import type { PublicMessage } from "@/lib/data";
import { parseSongfessContent } from "@/lib/messages/songfess";
import { pastelTint } from "@/lib/utils/color";
import { formatSiteDate } from "@/lib/utils/time";
import { MessageLike } from "./message-like";
import { StoryShareButton } from "./story-share-button";

/**
 * Kartu pesan anonim. Mendukung tint adaptif tema, pemutar langsung kapsul
 * Songfess ke Dynamic Island, tombol suka, dan ekspor Kartu Story 9:16.
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

  return (
    <Card
      variant="elevated"
      className="p-3.5"
      style={{ backgroundColor: pastelTint(message.id) }}
    >
      <p className="text-foreground text-footnote leading-relaxed whitespace-pre-line wrap-break-word">
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
          className="motion-pressable border-foreground/10 bg-surface/65 hover:bg-surface/85 mt-2.5 flex w-full items-center gap-2.5 rounded-2xl border px-2.5 py-2 text-left backdrop-blur-md transition-colors"
        >
          <span className="bg-primary text-primary-foreground grid size-7 shrink-0 place-items-center rounded-full">
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

      <div className="text-muted mt-2.5 flex items-center justify-between gap-2 text-caption2">
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
