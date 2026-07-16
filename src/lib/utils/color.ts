/**
 * Helper warna deterministik (seed -> warna tetap). Dipakai ulang oleh Avatar
 * (ring + inisial), MediaCard (placeholder pastel), dan MessageCard (tint).
 * Semua "sarang laba-laba": satu sumber, banyak pemakai.
 */

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Pasangan gradient untuk ring avatar / placeholder media.
const GRADIENTS: [string, string][] = [
  ["#E60023", "#FF7A00"],
  ["#7A5CFF", "#E7A5C4"],
  ["#00B4D8", "#7A5CFF"],
  ["#34C759", "#A6E3A1"],
  ["#FF7A00", "#E60023"],
  ["#E7A5C4", "#A6B1E1"],
];

// Tint pastel lembut untuk kartu pesan / placeholder.
const PASTELS: string[] = [
  "#F3E8D8",
  "#EAD9E6",
  "#D9E4F0",
  "#DDEBDB",
  "#F0E6D2",
  "#E9DEF2",
];

// Warna solid "muted" untuk latar avatar (inisial putih), sesuai gaya Figma.
const MUTED: string[] = [
  "#B79A78",
  "#A98BC9",
  "#7FA8D0",
  "#83C09A",
  "#C99A9A",
  "#9AA9C9",
  "#C9B08A",
  "#8FBFC0",
];

function pickGradient(seed: string): [string, string] {
  return GRADIENTS[hash(seed) % GRADIENTS.length]!;
}

function pickPastel(seed: string): string {
  return PASTELS[hash(seed) % PASTELS.length]!;
}

/**
 * Tint pesan yang AMAN di light & dark: campur pastel dengan token --surface
 * lewat color-mix. Light -> pastel lembut (teks ink terbaca); dark -> permukaan
 * gelap ber-semburat (teks terang terbaca). Fallback bila color-mix tak didukung:
 * nilai diabaikan browser -> kartu memakai bg-surface adaptif (tetap terbaca).
 */
export function pastelTint(seed: string): string {
  return `color-mix(in srgb, ${pickPastel(seed)} 22%, rgb(var(--surface)))`;
}

export function pickMuted(seed: string): string {
  return MUTED[hash(seed) % MUTED.length]!;
}

function channelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return 0;
  const value = Number.parseInt(match[1]!, 16);
  const red = channelToLinear((value >> 16) & 255);
  const green = channelToLinear((value >> 8) & 255);
  const blue = channelToLinear(value & 255);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Warna teks avatar dipilih dari kontras aktual, bukan asumsi semua pastel gelap. */
export function mutedAvatarColors(seed: string): {
  background: string;
  foreground: string;
} {
  const background = pickMuted(seed);
  const dark = "#1C1C1E";
  const light = "#FFFFFF";
  return {
    background,
    foreground:
      contrastRatio(background, dark) >= contrastRatio(background, light)
        ? dark
        : light,
  };
}

export function gradientCss(seed: string, angle = 135): string {
  const [a, b] = pickGradient(seed);
  return `linear-gradient(${angle}deg, ${a}, ${b})`;
}

/** Inisial dari nama, mis. "Ahmad Fajar" -> "AF" (maks 2 huruf). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}
