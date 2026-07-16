import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { initials, mutedAvatarColors } from "@/lib/utils/color";

/**
 * Avatar bulat: latar warna muted solid + inisial putih (fallback), atau foto.
 * `ring` = cincin aksen untuk menandai anggota inti.
 * Dipakai ulang di direktori, Tentang, Profil, pesan/komentar, dan admin.
 */
export function Avatar({
  src,
  name,
  size = 54,
  ring = false,
  className,
}: {
  src?: string | null;
  name: string;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const colors = mutedAvatarColors(name);
  const inner = (
    <div
      className="relative overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: colors.background,
        color: colors.foreground,
      }}
    >
      {src ? (
        <Image src={src} alt={name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-semibold"
          style={{ fontSize: Math.round(size * 0.4) }}
        >
          {initials(name)}
        </div>
      )}
    </div>
  );

  if (!ring) return <div className={className}>{inner}</div>;

  // Cincin merah (pengurus): padding tipis + latar bg agar ada celah.
  return (
    <div
      className={cn("bg-primary rounded-full p-[2.5px]", className)}
    >
      <div className="bg-bg rounded-full p-[2px]">{inner}</div>
    </div>
  );
}
