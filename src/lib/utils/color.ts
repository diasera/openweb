/**
 * Pusat ilmu warna aplikasi (Pola Sarang Laba-Laba):
 * - Konversi sRGB <-> Oklab / OKLCH (keseragaman perseptual & Display P3)
 * - Rasio kontras ganda: WCAG 2.2 (luminansi relatif) & APCA-W3 (kontras perseptual Lc)
 * - Generator warna deterministik untuk Avatar, tint kartu pesan, & placeholder mesh.
 */

export type Rgb = readonly [number, number, number];

export interface Oklch {
  /** Perceptual lightness `0..1` */
  l: number;
  /** Chroma `0..0.4` */
  c: number;
  /** Hue angle `0..360` */
  h: number;
}

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/** Parse "#RRGGBB" atau "RRGGBB" menjadi tuple RGB 0..255. */
export function parseHexRgb(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1]!, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function srgbToLinear(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(linear: number): number {
  const clamped = Math.max(0, Math.min(1, linear));
  const encoded =
    clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return clampByte(encoded * 255);
}

function rgbLuminance([red, green, blue]: Rgb): number {
  return (
    0.2126 * srgbToLinear(red) +
    0.7152 * srgbToLinear(green) +
    0.0722 * srgbToLinear(blue)
  );
}

/** Rasio kontras WCAG 2.1/2.2 antara dua tuple RGB `(1..21)`. */
export function rgbContrastRatio(first: Rgb, second: Rgb): number {
  const a = rgbLuminance(first);
  const b = rgbLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/**
 * Kontras perseptual APCA-W3 (`Lc`, rentang sekitar `-108..+106`).
 * Memperhitungkan polaritas (teks gelap di atas terang vs teks terang di atas gelap).
 * Nilai absolut `>= 60` nyaman untuk teks antarmuka; `>= 75` ideal untuk teks isi.
 */
export function apcaContrastLc(text: Rgb, background: Rgb): number {
  const yTxt =
    0.2126729 * (text[0] / 255) ** 2.4 +
    0.7151522 * (text[1] / 255) ** 2.4 +
    0.072175 * (text[2] / 255) ** 2.4;
  const yBg =
    0.2126729 * (background[0] / 255) ** 2.4 +
    0.7151522 * (background[1] / 255) ** 2.4 +
    0.072175 * (background[2] / 255) ** 2.4;

  const txtClamped = yTxt > 0.022 ? yTxt : yTxt + (0.022 - yTxt) ** 1.414;
  const bgClamped = yBg > 0.022 ? yBg : yBg + (0.022 - yBg) ** 1.414;
  if (Math.abs(bgClamped - txtClamped) < 0.0005) return 0;

  if (bgClamped > txtClamped) {
    const sapc = (bgClamped ** 0.56 - txtClamped ** 0.57) * 1.14;
    return sapc < 0.1 ? 0 : (sapc - 0.027) * 100;
  }
  const sapc = (bgClamped ** 0.65 - txtClamped ** 0.62) * 1.14;
  return sapc > -0.1 ? 0 : (sapc + 0.027) * 100;
}

interface Oklab {
  l: number;
  a: number;
  b: number;
}

function rgbToOklab([r, g, b]: Rgb): Oklab {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabToLinearRgb({ l, a, b }: Oklab): [number, number, number] {
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.291485548 * b;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  return [
    +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  ];
}

function inSrgbGamut([r, g, b]: [number, number, number]): boolean {
  const eps = 1e-4;
  return (
    r >= -eps && r <= 1 + eps &&
    g >= -eps && g <= 1 + eps &&
    b >= -eps && b <= 1 + eps
  );
}

/** Konversi tuple sRGB `0..255` ke ruang perseptual OKLCH. */
export function rgbToOklch(rgb: Rgb): Oklch {
  const { l, a, b } = rgbToOklab(rgb);
  const c = Math.hypot(a, b);
  const rawHue = (Math.atan2(b, a) * 180) / Math.PI;
  return {
    l: Math.max(0, Math.min(1, l)),
    c,
    h: c < 1e-4 ? 0 : (rawHue + 360) % 360,
  };
}

/**
 * Konversi OKLCH kembali ke tuple sRGB `0..255` dengan penjepitan chroma biner
 * (hue & lightness terjaga murni tanpa pergeseran rona warna).
 */
export function oklchToRgb({ l, c, h }: Oklch): Rgb {
  const clampedL = Math.max(0, Math.min(1, l));
  if (clampedL <= 0) return [0, 0, 0];
  if (clampedL >= 1) return [255, 255, 255];

  const rad = (h * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const direct = oklabToLinearRgb({ l: clampedL, a: c * cos, b: c * sin });
  if (inSrgbGamut(direct)) {
    return [linearToSrgb(direct[0]), linearToSrgb(direct[1]), linearToSrgb(direct[2])];
  }

  let low = 0;
  let high = Math.max(0, c);
  for (let i = 0; i < 14; i++) {
    const mid = (low + high) / 2;
    const candidate = oklabToLinearRgb({ l: clampedL, a: mid * cos, b: mid * sin });
    if (inSrgbGamut(candidate)) low = mid;
    else high = mid;
  }
  const safe = oklabToLinearRgb({ l: clampedL, a: low * cos, b: low * sin });
  return [linearToSrgb(safe[0]), linearToSrgb(safe[1]), linearToSrgb(safe[2])];
}

/** Format string CSS `oklch(L C H)` untuk tampilan wide-gamut Display P3. */
export function formatOklch({ l, c, h }: Oklch): string {
  const rl = Math.max(0, Math.min(1, l)).toFixed(4);
  const rc = Math.max(0, Math.min(0.37, c)).toFixed(4);
  const rh = ((h % 360) + 360) % 360;
  return `oklch(${Number(rl)} ${Number(rc)} ${Number(rh.toFixed(2))})`;
}

/** Campur dua warna secara perseptual di ruang Oklab (bebas warna keruh sRGB). */
export function mixOklabRgb(source: Rgb, target: Rgb, amount: number): Rgb {
  const t = Math.max(0, Math.min(1, amount));
  const a = rgbToOklab(source);
  const b = rgbToOklab(target);
  const linear = oklabToLinearRgb({
    l: a.l + (b.l - a.l) * t,
    a: a.a + (b.a - a.a) * t,
    b: a.b + (b.b - a.b) * t,
  });
  return [linearToSrgb(linear[0]), linearToSrgb(linear[1]), linearToSrgb(linear[2])];
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
 * di ruang oklab agar rona hangat/sejuk tetap jernih di kedua mode tema.
 */
export function pastelTint(seed: string): string {
  return `color-mix(in oklab, ${pickPastel(seed)} 20%, rgb(var(--surface)))`;
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
 * — dengan posisi, sudut, dan aksen berbeda per seed.
 */
export function gradientCss(seed: string, angle = 135): string {
  const value = hash(seed);
  const tone = MESH_TONES[value % MESH_TONES.length];
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
