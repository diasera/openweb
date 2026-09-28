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
        // Hairline dalam: avatar terang tetap berbatas di atas kartu putih.
        "after:pointer-events-none after:absolute after:inset-0 after:rounded-full after:ring-1 after:ring-black/6 after:ring-inset after:content-[''] dark:after:ring-white/10",
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
      <div className={cn(reserveRingSpace && "rounded-full p-[4.5px]", className)}>
        {inner}
      </div>
    );
  }

  // Cincin gradien (pengurus): padding tipis + latar bg agar ada celah
  // (2.5px + 2px = ruang yang sama dengan `reserveRingSpace`).
  return (
    <div
      className={cn("avatar-ring rounded-full p-[2.5px]", className)}
    >
      <div className="bg-bg rounded-full p-[2px]">{inner}</div>
    </div>
  );
}
