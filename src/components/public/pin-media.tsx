"use client";

import type { CSSProperties } from "react";
import { MediaCarousel } from "@/components/ui/media-carousel";
import type { MediaSlide } from "@/lib/media/slides";
import { useSaveToggle } from "./share-save";

/** Media detail pin: carousel + ketuk dua kali untuk Simpan (pola Instagram). */
export function PinMedia({
  mediaId,
  slides,
  label,
  aspectRatio,
  className,
  style,
}: {
  mediaId: string;
  slides: MediaSlide[];
  label: string;
  aspectRatio: number;
  className?: string;
  style?: CSSProperties;
}) {
  const { save } = useSaveToggle("pin", mediaId);
  return (
    <MediaCarousel
      slides={slides}
      label={label}
      aspectRatio={aspectRatio}
      sizes="(max-width: 672px) 100vw, (max-width: 1023px) 512px, 560px"
      preloadFirst
      onDoubleTap={save}
      className={className}
      style={style}
    />
  );
}
