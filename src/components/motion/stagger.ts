/**
 * Delay stagger untuk entrance daftar (dipakai dengan .animate-rise).
 * Item di luar `cap` pertama diberi 0ms — hanya layar pertama yang
 * berkoreografi, daftar panjang tetap langsung tampil.
 */
export function staggerDelay(
  index: number,
  stepMs = 35,
  cap = 10,
): string | undefined {
  if (index >= cap) return undefined;
  return `${index * stepMs}ms`;
}

/** Item pertama layar mendapat koreografi waktu; sisanya bangkit saat digulir. */
const LIST_REVEAL_STAGGERED = 6;

/**
 * Kelas + style masuk untuk item daftar/grid: `animate-rise` ber-stagger
 * untuk layar pertama, `motion-reveal` (3D berbasis scroll) untuk sisanya.
 * Pasang pada pembungkus item, bukan pada kartu yang ikut tilt.
 */
export function listReveal(index: number): {
  className: string;
  style?: { animationDelay?: string };
} {
  return index < LIST_REVEAL_STAGGERED
    ? {
        className: "animate-rise",
        style: { animationDelay: staggerDelay(index, 45, LIST_REVEAL_STAGGERED) },
      }
    : { className: "motion-reveal" };
}
