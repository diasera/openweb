export interface AspectRatioLimits {
  min: number;
  max: number;
}

export const MEDIA_ASPECT_LIMITS = {
  /** Grid Pinterest tetap memberi ruang untuk portrait 1:2 dan panorama 2:1. */
  card: { min: 0.5, max: 2 },
  /** Detail lebih longgar, tetapi metadata ekstrem tidak boleh memanjangkan DOM. */
  detail: { min: 0.25, max: 4 },
} as const satisfies Record<string, AspectRatioLimits>;

/**
 * Normalisasi metadata dimensi dari FormData, probe browser, atau database.
 * Kedua sisi wajib hadir sebagai integer positif agar metadata parsial tidak
 * pernah menjadi sumber rasio yang berbeda antara client dan server.
 */
export function normalizeMediaDimensions(
  width: unknown,
  height: unknown,
  maxDimension: number,
): { width: number; height: number } | null {
  const parseDimension = (value: unknown): number | null => {
    if (
      typeof value !== "number" &&
      (typeof value !== "string" || !/^\d+$/.test(value.trim()))
    ) {
      return null;
    }

    const parsed = typeof value === "number" ? value : Number(value.trim());
    return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : null;
  };

  if (!Number.isSafeInteger(maxDimension) || maxDimension < 1) return null;

  const normalizedWidth = parseDimension(width);
  const normalizedHeight = parseDimension(height);
  if (
    normalizedWidth === null ||
    normalizedHeight === null ||
    normalizedWidth > maxDimension ||
    normalizedHeight > maxDimension
  ) {
    return null;
  }

  return { width: normalizedWidth, height: normalizedHeight };
}

/**
 * Rasio tampilan defensif. Byte media tidak diubah; clamp hanya melindungi
 * layout dari metadata dimensi lama, rusak, atau dimanipulasi client.
 */
export function mediaDisplayAspectRatio(
  width: number | null,
  height: number | null,
  fallback: number,
  limits: AspectRatioLimits,
): number {
  if (
    width === null ||
    height === null ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return fallback;
  }
  return Math.min(limits.max, Math.max(limits.min, width / height));
}
