"use client";

import { useMemo, useState } from "react";
import { Images, Play } from "lucide-react";
import { MediaCard } from "@/components/public/media-card";
import {
  matchesMediaAspectFilter,
  MediaGridControls,
  type MediaAspectFilter,
  type MediaGridDensity,
} from "@/components/public/media-grid-controls";
import { listReveal } from "@/components/motion";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Masonry } from "@/components/ui/masonry";
import { MediaLightbox } from "@/components/ui/media-lightbox";
import type { MediaSlide, MediaWithSlideCount } from "@/lib/media/slides";

/**
 * Penjelajah isi Album: memakai `MediaGridControls` terpusat (filter bentuk +
 * kepadatan Masonry) serta tombol Slideshow teater layar penuh via `MediaLightbox`.
 */
export function AlbumDetailBrowser({
  media,
  albumTitle,
}: {
  media: MediaWithSlideCount[];
  albumTitle: string;
}) {
  const [aspect, setAspect] = useState<MediaAspectFilter>("all");
  const [density, setDensity] = useState<MediaGridDensity>("comfortable");
  const [slideshowOpen, setSlideshowOpen] = useState(false);

  const visible = useMemo(
    () => media.filter((item) => matchesMediaAspectFilter(item, aspect)),
    [aspect, media],
  );

  const slides = useMemo<MediaSlide[]>(
    () =>
      visible.map((item) => ({
        id: item.id,
        type: item.type,
        url: item.url,
        mime_type: item.mime_type,
        width: item.width,
        height: item.height,
      })),
    [visible],
  );

  if (media.length === 0) {
    return (
      <EmptyState
        icon={<Images className="h-8 w-8" />}
        title="Album masih kosong"
        description="Foto dan video acara ini akan tampil setelah disetujui admin."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <MediaGridControls
          aspect={aspect}
          onAspectChange={setAspect}
          density={density}
          onDensityChange={setDensity}
          className="flex-1"
        />
        {slides.length > 0 && (
          <button
            type="button"
            onClick={() => setSlideshowOpen(true)}
            className={buttonClass({
              variant: "outline",
              size: "sm",
              className: "shrink-0 gap-1.5 text-xs",
            })}
          >
            <Play className="size-3.5 fill-current" aria-hidden="true" />
            Slideshow
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-muted py-10 text-center text-sm">
          Tidak ada media yang cocok dengan filter bentuk ini.
        </p>
      ) : (
        <Masonry density={density}>
          {visible.map((item, index) => (
            <div key={item.id} {...listReveal(index)}>
              <MediaCard media={item} showMeta />
            </div>
          ))}
        </Masonry>
      )}

      <MediaLightbox
        open={slideshowOpen}
        onClose={() => setSlideshowOpen(false)}
        slides={slides}
        label={albumTitle}
      />
    </div>
  );
}
