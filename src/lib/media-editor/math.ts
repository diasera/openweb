/** Clamp angka bersama seluruh geometri dan renderer editor media. */
export function clampNumber(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(maximum, Math.max(minimum, value));
}
