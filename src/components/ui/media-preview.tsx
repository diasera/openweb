import Image from "next/image";
import { slidePreviewUrl, type MediaSlide } from "@/lib/media/slides";
import { gradientCss } from "@/lib/utils/color";
import { cn } from "@/lib/utils/cn";

/** Fragmen waktu kecil agar browser (termasuk iOS Safari) melukis frame pertama. */
const FIRST_FRAME = "#t=0.1";

/**
 * Pratinjau diam satu media untuk kartu dan daftar: foto atau poster lewat
 * next/image, video tanpa poster memakai frame pertamanya sendiri (tanpa
 * kontrol dan suara), dan gradien deterministik bila belum ada URL. Dipakai
 * kartu galeri, Kenangan, album, riwayat anggota, moderasi komentar, dan
 * filmstrip Buat Pin. Elemen mengisi penuh wadah: pemanggil wajib `relative`.
 */
export function MediaPreview({
  media,
  alt,
  sizes,
  seed,
  unoptimized = false,
  stillOnly = false,
  className,
}: {
  media: Pick<MediaSlide, "type" | "url" | "thumbnail_url">;
  alt: string;
  sizes: string;
  /** Kunci gradien placeholder (biasanya id media). */
  seed: string;
  /** Signed URL/blob tidak boleh disimpan cache optimizer Next. */
  unoptimized?: boolean;
  /** Dekorasi (mis. dinding gerbang Auth): video tanpa poster jadi gradien, tidak diunduh. */
  stillOnly?: boolean;
  className?: string;
}) {
  const still = slidePreviewUrl(media);
  if (still) {
    return (
      <Image
        src={still}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized={unoptimized}
        draggable={false}
        className={cn("object-cover", className)}
      />
    );
  }
  if (media.type === "video" && media.url && !stillOnly) {
    return (
      <video
        src={`${media.url}${FIRST_FRAME}`}
        muted
        playsInline
        preload="metadata"
        tabIndex={-1}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full object-cover",
          className,
        )}
      />
    );
  }
  return (
    <div
      className="absolute inset-0"
      style={{ background: gradientCss(seed) }}
      aria-hidden="true"
    />
  );
}
