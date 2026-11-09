/**
 * Helper warna deterministik & utilitas kontras WCAG 2.1.
 * Dipakai oleh Avatar (inisial), placeholder media tanpa gambar, MessageCard (tint),
 * dan generator token tema (`src/lib/theme.ts`).
 * Semua "sarang laba-laba": satu sumber perhitungan warna untuk seluruh aplikasi.
 */

export type Rgb = readonly [number, number, number];

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Parse "#RRGGBB" atau "RRGGBB" menjadi tuple RGB 0..255. */
export function parseHexRgb(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1]!, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function channelToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function rgbLuminance([red, green, blue]: Rgb): number {
  return (
    0.2126 * channelToLinear(red) +
    0.7152 * channelToLinear(green) +
    0.0722 * channelToLinear(blue)
  );
}

/** Rasio kontras WCAG 2.1 antara dua tuple RGB `(1..21)`. */
export function rgbContrastRatio(first: Rgb, second: Rgb): number {
  const a = rgbLuminance(first);
  const b = rgbLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

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

function pickMuted(seed: string): string {
  return MUTED[hash(seed) % MUTED.length]!;
}

const DARK_INK_RGB: Rgb = [28, 28, 30];
const LIGHT_INK_RGB: Rgb = [255, 255, 255];

/** Warna teks avatar dipilih dari kontras aktual, bukan asumsi semua pastel gelap. */
export function mutedAvatarColors(seed: string): {
  background: string;
  foreground: string;
} {
  const background = pickMuted(seed);
  const rgb = parseHexRgb(background) ?? DARK_INK_RGB;
  return {
    background,
    foreground:
      rgbContrastRatio(rgb, DARK_INK_RGB) >= rgbContrastRatio(rgb, LIGHT_INK_RGB)
        ? "#1C1C1E"
        : "#FFFFFF",
  };
}

/** Aksen kedua placeholder; token tone mengikuti tema terang/gelap. */
const MESH_TONES = ["orange", "indigo", "teal", "pink", "purple", "blue"] as const;

/**
 * Placeholder media tanpa gambar: mesh gradient dua sumber cahaya — warna
 * utama tema (mengikuti Setting admin dan tema gelap) plus satu tone sistem
 * — dengan posisi, sudut, dan aksen berbeda per seed. Tanpa color-mix,
 * deklarasi diabaikan dan wadah bg-surface-2 tetap tampil.
 */
export function gradientCss(seed: string, angle = 135): string {
  const value = hash(seed);
  const tone = MESH_TONES[value % MESH_TONES.length];
  // `>>>`, bukan `>>`: hash tak bertanda ≥ 2^31 menjadi negatif bila digeser
  // bertanda, sehingga posisi/intensitas keluar dari rentang yang dimaksud.
  const x = 15 + ((value >>> 3) % 5) * 12;
  const y = 10 + ((value >>> 6) % 4) * 14;
  const strong = 34 + ((value >>> 9) % 4) * 8;
  const turn = angle + ((value >>> 4) % 5) * 12 - 24;
  const primary = `color-mix(in oklab, rgb(var(--primary)) ${strong}%, transparent)`;
  const accent = `color-mix(in oklab, rgb(var(--tone-${tone})) ${strong - 6}%, transparent)`;
  return [
    `radial-gradient(90% 75% at ${x}% ${y}%, ${primary}, transparent 70%)`,
    `radial-gradient(85% 80% at ${100 - x}% ${100 - y / 2}%, ${accent}, transparent 72%)`,
    `linear-gradient(${turn}deg, color-mix(in oklab, rgb(var(--primary)) 16%, rgb(var(--surface-2))), rgb(var(--surface-2)))`,
  ].join(", ");
}

/** Inisial dari nama, mis. "Ahmad Fajar" -> "AF" (maks 2 huruf). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}
