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
