import Image from "next/image";
import { getPhotoDestinationFrame } from "@/lib/media-editor/profiles";

const SITE_LOGO_FRAME = getPhotoDestinationFrame("site-logo");

/**
 * Logo website: gambar konfigurasi atau monogram berwarna aksen. Satu sumber
 * untuk Dynamic Island, panel cepat, kartu identitas, dan gerbang admin.
 */
export function SiteLogo({
  name,
  url,
  size = 64,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  if (url) {
    return (
      <Image
        src={url}
        alt={`Logo ${name}`}
        width={size}
        height={size}
        className="shrink-0 rounded-full"
        style={{
          width: size,
          height: size,
          objectFit: SITE_LOGO_FRAME.objectFit,
        }}
      />
    );
  }

  return (
    <div
      className="gloss bg-primary text-primary-foreground font-display grid shrink-0 place-items-center rounded-full font-bold"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-label={`Logo ${name}`}
    >
      {name.charAt(0).toLocaleUpperCase()}
    </div>
  );
}

