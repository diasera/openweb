"use client";

import { Hero } from "@/components/public/hero";
import type { ImageFieldPreview } from "@/components/admin/image-field";
import {
  resolveHeroContent,
  type HeroSettings,
} from "@/lib/site-config/client";

/**
 * Pratinjau hero beranda: komponen Hero produksi + resolver yang sama dengan
 * halaman depan, jadi yang tampil di sini persis yang dilihat pengunjung.
 */
export function HeroPreview({
  settings,
  image,
}: {
  settings: HeroSettings;
  image: ImageFieldPreview;
}) {
  return (
    <figure className="space-y-2">
      {/* Duplikat visual dari field di bawahnya, jadi disembunyikan dari pembaca layar. */}
      <div aria-hidden="true" className="pointer-events-none select-none">
        <Hero
          {...resolveHeroContent(settings)}
          imageUrl={image.url}
          imageWidth={image.dimensions?.width}
          imageHeight={image.dimensions?.height}
          priority={false}
          scrollMotion={false}
        />
      </div>
      <figcaption className="text-muted text-xs">
        Pratinjau langsung hero beranda. Nama alternatif tidak pernah tampil di sini.
      </figcaption>
    </figure>
  );
}
