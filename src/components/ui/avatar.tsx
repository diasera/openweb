import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { initials, mutedAvatarColors } from "@/lib/utils/color";

/**
 * Avatar bulat: latar warna muted solid + inisial putih (fallback), atau foto.
 * `ring` = cincin gradien aksen untuk menandai anggota inti.
 * `reserveRingSpace` = sisakan ruang cincin tanpa menggambarnya, agar avatar
 * bercincin dan tidak tetap sejajar dalam satu baris/grid.
 * Dipakai ulang di direktori, Tentang, Profil, pesan/komentar, dan admin.
 *
 * `sizeClassName`/`initialsClassName` menggantikan dimensi inline ketika avatar
 * perlu responsif (mis. lebih kecil di ponsel): kelas menang atas `size`.
 */
export function Avatar({
  src,
  name,
  size = 54,
  ring = false,
  reserveRingSpace = false,
  className,
  sizeClassName,
  initialsClassName,
}: {
  src?: string | null;
  name: string;
  size?: number;
  ring?: boolean;
  reserveRingSpace?: boolean;
  className?: string;
  sizeClassName?: string;
  initialsClassName?: string;
}) {
  const colors = mutedAvatarColors(name);
  const inner = (
    <div
      className={cn(
        "relative overflow-hidden rounded-full",
        // Hairline dalam: avatar berlatar putih tetap berbatas tajam di atas bg/kartu terang.
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:ring-1 after:ring-black/12 after:ring-inset after:content-[''] dark:after:ring-white/16",
        sizeClassName ?? "h-auto w-auto",
      )}
      style={{
        ...(sizeClassName ? undefined : { width: size, height: size }),
        backgroundColor: colors.background,
        color: colors.foreground,
      }}
    >
      {src ? (
        <Image src={src} alt={name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <div
          className={cn(
            // Kilau diagonal tipis memberi volume pada latar inisial yang datar.
            "font-display flex h-full w-full items-center justify-center bg-linear-to-br from-white/22 to-black/6 font-semibold",
            initialsClassName,
          )}
          style={initialsClassName ? undefined : { fontSize: Math.round(size * 0.4) }}
        >
          {initials(name)}
        </div>
      )}
    </div>
  );

  if (!ring) {
    return (
      <div className={cn(reserveRingSpace && "rounded-full p-[3.5px]", className)}>
        {inner}
      </div>
    );
  }

  // Cincin gradien (pengurus): padding ramping agar ukuran optik tetap seimbang
  // dengan avatar di sekitarnya (2px + 1.5px = ruang sama dengan `reserveRingSpace`).
  // Warna celah mengikuti `--avatar-gap` (default bg halaman, kartu set ke surface).
  return (
    <div
      className={cn("avatar-ring rounded-full p-[2px]", className)}
    >
      <div className="rounded-full bg-[var(--avatar-gap,rgb(var(--bg)))] p-[1.5px]">{inner}</div>
    </div>
  );
}
