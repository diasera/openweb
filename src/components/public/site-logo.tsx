import Image from "next/image";
import { getPhotoDestinationFrame } from "@/lib/media-editor/profiles";

const SITE_LOGO_FRAME = getPhotoDestinationFrame("site-logo");

/** Logo website: gambar konfigurasi atau fallback inisial berwarna aksen. */
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
        className="rounded-full"
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
      className="bg-primary grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-label={`Logo ${name}`}
    >
      {name.charAt(0).toLocaleUpperCase()}
    </div>
  );
}

