import type { ThemeTokens } from "@/lib/types/database";

type Rgb = readonly [number, number, number];

const LIGHT_BACKGROUNDS: readonly Rgb[] = [
  [242, 242, 247],
  [255, 255, 255],
];
const DARK_BACKGROUNDS: readonly Rgb[] = [
  [10, 10, 12],
  [28, 28, 30],
];
const DARK_FOREGROUND: Rgb = [28, 28, 30];
const LIGHT_FOREGROUND: Rgb = [255, 255, 255];
const MIN_TEXT_CONTRAST = 4.5;

/**
 * Token tema yang boleh di-override dari menu Setting. Nilai = channel RGB
 * (mis. "230 0 35"). Dipakai layout (inject :root) & form Setting (preview).
 */
const THEME_KEYS = [
  "bg",
  "surface",
  "surface-2",
  "border",
  "foreground",
  "muted",
  "primary",
  "primary-foreground",
  "accent",
  "danger",
  "success",
  "warning",
] as const;

function parseRgbChannels(value: unknown): Rgb | null {
  if (typeof value !== "string") return null;
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const channels = parts.map(Number);
  if (
    channels.some(
      (channel) =>
        !Number.isInteger(channel) || channel < 0 || channel > 255,
    )
  ) {
    return null;
  }
  return [channels[0]!, channels[1]!, channels[2]!];
}

function rgbChannels(rgb: Rgb): string {
  return rgb.join(" ");
}

/** Nilai legacy dari database tetap harus berupa tepat tiga channel RGB. */
function normalizeRgbChannels(value: unknown): string | null {
  const parsed = parseRgbChannels(value);
  return parsed ? rgbChannels(parsed) : null;
}

function linearChannel(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance([red, green, blue]: Rgb): number {
  return (
    0.2126 * linearChannel(red) +
    0.7152 * linearChannel(green) +
    0.0722 * linearChannel(blue)
  );
}

function contrastRatio(first: Rgb, second: Rgb): number {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function mixRgb(source: Rgb, target: Rgb, amount: number): Rgb {
  return [
    Math.round(source[0] + (target[0] - source[0]) * amount),
    Math.round(source[1] + (target[1] - source[1]) * amount),
    Math.round(source[2] + (target[2] - source[2]) * amount),
  ];
}

/**
 * Warna brand tetap dipakai untuk fill. Versi readable hanya mengatur teks dan
 * ikon, lalu digeser seperlunya menuju gelap/terang sampai AA pada dua surface.
 */
function readablePrimary(
  primary: Rgb,
  backgrounds: readonly Rgb[],
  target: Rgb,
): Rgb {
  for (let step = 0; step <= 100; step += 1) {
    const candidate = mixRgb(primary, target, step / 100);
    if (
      backgrounds.every(
        (background) =>
          contrastRatio(candidate, background) >= MIN_TEXT_CONTRAST,
      )
    ) {
      return candidate;
    }
  }
  return target;
}

function primaryForeground(primary: Rgb): Rgb {
  return contrastRatio(primary, DARK_FOREGROUND) >=
    contrastRatio(primary, LIGHT_FOREGROUND)
    ? DARK_FOREGROUND
    : LIGHT_FOREGROUND;
}

/** Bangun CSS `:root{…}` dari theme tersimpan. null bila tak ada override. */
export function themeCss(theme: ThemeTokens | null | undefined): string | null {
  if (!theme) return null;
  const lines = THEME_KEYS.flatMap((key) => {
    const value = normalizeRgbChannels(theme[key]);
    return value ? [`--${key}: ${value};`] : [];
  });
  const primary = parseRgbChannels(theme.primary);
  if (!primary) return lines.length ? `:root{${lines.join("")}}` : null;

  const lightBackgrounds = [
    parseRgbChannels(theme.bg) ?? LIGHT_BACKGROUNDS[0]!,
    parseRgbChannels(theme.surface) ?? LIGHT_BACKGROUNDS[1]!,
  ];
  const lightReadable = readablePrimary(
    primary,
    lightBackgrounds,
    DARK_FOREGROUND,
  );
  const darkReadable = readablePrimary(
    primary,
    DARK_BACKGROUNDS,
    LIGHT_FOREGROUND,
  );
  lines.push(
    `--primary-readable: ${rgbChannels(lightReadable)};`,
    `--primary-foreground: ${rgbChannels(primaryForeground(primary))};`,
  );

  return `:root{${lines.join("")}}.dark{--primary-readable:${rgbChannels(darkReadable)};}`;
}

/** "#E60023" -> "230 0 35" (channel RGB untuk CSS var). null bila tak valid. */
export function hexToRgbChannels(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1]!, 16);
  return `${(int >> 16) & 255} ${(int >> 8) & 255} ${int & 255}`;
}

/** "230 0 35" -> "#e60023" (untuk input color di form Setting). */
export function rgbChannelsToHex(channels: string): string {
  const [r, g, b] = channels.trim().split(/\s+/).map((n) => Number(n));
  const to2 = (n: number) => Math.max(0, Math.min(255, n | 0)).toString(16).padStart(2, "0");
  return `#${to2(r ?? 0)}${to2(g ?? 0)}${to2(b ?? 0)}`;
}
