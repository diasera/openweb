import type { ThemeTokens } from "@/lib/types/database";
import {
  apcaContrastLc,
  formatOklch,
  mixOklabRgb,
  oklchToRgb,
  parseHexRgb,
  rgbContrastRatio,
  rgbToOklch,
  type Rgb,
} from "@/lib/utils/color";

const MIN_TEXT_CONTRAST = 4.5;
const MIN_LIGHT_APCA_LC = 55;
const MIN_DARK_APCA_LC = 42;
/** Chip & ubin memakai bg-primary/10–12; teks readable harus AA di atasnya juga. */
const PRIMARY_TINT = 0.12;

export const THEME_PRESET_IDS = [
  "liquid-spatial",
  "editorial-paper",
  "midnight-botanical",
  "studio-bento",
  "tactile-zine",
] as const;

export type ThemePresetId = (typeof THEME_PRESET_IDS)[number];

export const DEFAULT_THEME_PRESET: ThemePresetId = "liquid-spatial";

interface ModeSurfaceTokens {
  bg: Rgb;
  surface: Rgb;
  surface2: Rgb;
  surfaceElevated: Rgb;
  border: Rgb;
  foreground: Rgb;
  muted: Rgb;
  glassBg: string;
  glassBgStrong: string;
  glassBorder: string;
  elevationSoft: string;
  elevationRaised: string;
}

export interface ThemePresetDefinition {
  id: ThemePresetId;
  label: string;
  badge: string;
  description: string;
  recommendedPrimary: string;
  recommendedAccent: string;
  radius: {
    ios: string;
    iosLg: string;
    card: string;
    pin: string;
  };
  grainOpacity: string;
  light: ModeSurfaceTokens;
  dark: ModeSurfaceTokens;
}

export const THEME_PRESETS: readonly ThemePresetDefinition[] = [
  {
    id: "liquid-spatial",
    label: "Liquid Spatial",
    badge: "Bawaan",
    description: "Kaca spekular berlapis, sudut konsentris lembut, dan kontras bersih ala iOS 26.",
    recommendedPrimary: "#e60023",
    recommendedAccent: "#ff3b5c",
    radius: {
      ios: "1.25rem",
      iosLg: "1.75rem",
      card: "1.375rem",
      pin: "1rem",
    },
    grainOpacity: "0.14",
    light: {
      bg: [242, 242, 247],
      surface: [255, 255, 255],
      surface2: [233, 233, 238],
      surfaceElevated: [255, 255, 255],
      border: [232, 232, 237],
      foreground: [28, 28, 30],
      muted: [104, 104, 110],
      glassBg: "255 255 255 / 0.72",
      glassBgStrong: "255 255 255 / 0.86",
      glassBorder: "255 255 255 / 0.7",
      elevationSoft:
        "0 1px 2px rgb(16 16 20 / 0.03), 0 8px 24px -10px rgb(16 16 20 / 0.06)",
      elevationRaised:
        "0 2px 5px rgb(16 16 20 / 0.05), 0 14px 34px -10px rgb(16 16 20 / 0.11)",
    },
    dark: {
      bg: [10, 10, 12],
      surface: [28, 28, 30],
      surface2: [44, 44, 46],
      surfaceElevated: [50, 50, 54],
      border: [56, 56, 60],
      foreground: [245, 245, 247],
      muted: [174, 174, 178],
      glassBg: "24 24 27 / 0.66",
      glassBgStrong: "24 24 27 / 0.86",
      glassBorder: "255 255 255 / 0.12",
      elevationSoft:
        "inset 0 1px 0 rgb(255 255 255 / 0.05), 0 1px 2px rgb(0 0 0 / 0.3), 0 8px 24px -10px rgb(0 0 0 / 0.5)",
      elevationRaised:
        "inset 0 1px 0 rgb(255 255 255 / 0.07), 0 2px 5px rgb(0 0 0 / 0.35), 0 16px 36px -10px rgb(0 0 0 / 0.6)",
    },
  },
  {
    id: "editorial-paper",
    label: "Editorial Paper",
    badge: "Majalah",
    description: "Kertas gading hangat, garis tepi cetak tipis, dan nuansa jurnal yang tenang di mata.",
    recommendedPrimary: "#9a4e24",
    recommendedAccent: "#c26d38",
    radius: {
      ios: "0.9375rem",
      iosLg: "1.375rem",
      card: "1.0625rem",
      pin: "0.8125rem",
    },
    grainOpacity: "0.18",
    light: {
      bg: [247, 244, 237],
      surface: [255, 253, 249],
      surface2: [238, 233, 223],
      surfaceElevated: [255, 254, 251],
      border: [219, 212, 199],
      foreground: [28, 25, 22],
      muted: [101, 94, 86],
      glassBg: "252 249 243 / 0.78",
      glassBgStrong: "252 249 243 / 0.9",
      glassBorder: "255 255 255 / 0.72",
      elevationSoft:
        "0 1px 2px rgb(36 28 18 / 0.04), 0 6px 18px -10px rgb(36 28 18 / 0.06)",
      elevationRaised:
        "0 2px 6px rgb(36 28 18 / 0.06), 0 14px 28px -12px rgb(36 28 18 / 0.1)",
    },
    dark: {
      bg: [18, 16, 14],
      surface: [29, 26, 23],
      surface2: [43, 39, 34],
      surfaceElevated: [52, 47, 41],
      border: [64, 58, 51],
      foreground: [244, 239, 231],
      muted: [179, 171, 160],
      glassBg: "28 25 22 / 0.72",
      glassBgStrong: "28 25 22 / 0.88",
      glassBorder: "255 248 236 / 0.12",
      elevationSoft:
        "inset 0 1px 0 rgb(255 248 236 / 0.05), 0 1px 2px rgb(0 0 0 / 0.35), 0 8px 22px -10px rgb(0 0 0 / 0.52)",
      elevationRaised:
        "inset 0 1px 0 rgb(255 248 236 / 0.07), 0 2px 6px rgb(0 0 0 / 0.4), 0 16px 34px -10px rgb(0 0 0 / 0.62)",
    },
  },
  {
    id: "midnight-botanical",
    label: "Midnight Botanical",
    badge: "OLED",
    description: "Embun sejuk di mode terang dan hitam pekat AMOLED hemat baterai dengan aksen organik.",
    recommendedPrimary: "#0f766e",
    recommendedAccent: "#10b981",
    radius: {
      ios: "1.375rem",
      iosLg: "1.875rem",
      card: "1.5rem",
      pin: "1.125rem",
    },
    grainOpacity: "0.16",
    light: {
      bg: [240, 245, 242],
      surface: [255, 255, 255],
      surface2: [226, 235, 229],
      surfaceElevated: [255, 255, 255],
      border: [211, 223, 215],
      foreground: [18, 27, 22],
      muted: [84, 99, 90],
      glassBg: "248 252 249 / 0.74",
      glassBgStrong: "248 252 249 / 0.88",
      glassBorder: "255 255 255 / 0.72",
      elevationSoft:
        "0 1px 2px rgb(12 28 20 / 0.03), 0 8px 24px -10px rgb(12 28 20 / 0.07)",
      elevationRaised:
        "0 2px 5px rgb(12 28 20 / 0.05), 0 16px 36px -10px rgb(12 28 20 / 0.12)",
    },
    dark: {
      bg: [2, 4, 3],
      surface: [14, 19, 16],
      surface2: [24, 32, 27],
      surfaceElevated: [32, 42, 36],
      border: [42, 56, 48],
      foreground: [238, 245, 240],
      muted: [162, 178, 168],
      glassBg: "12 17 14 / 0.72",
      glassBgStrong: "12 17 14 / 0.9",
      glassBorder: "220 255 235 / 0.13",
      elevationSoft:
        "inset 0 1px 0 rgb(220 255 235 / 0.06), 0 1px 2px rgb(0 0 0 / 0.5), 0 10px 26px -10px rgb(0 0 0 / 0.72)",
      elevationRaised:
        "inset 0 1px 0 rgb(220 255 235 / 0.08), 0 2px 6px rgb(0 0 0 / 0.55), 0 18px 40px -10px rgb(0 0 0 / 0.8)",
    },
  },
  {
    id: "studio-bento",
    label: "Studio Neo-Bento",
    badge: "Modern Tech",
    description: "Slate kosmik presisi tinggi dengan kartu modular rapi ala studio produk digital.",
    recommendedPrimary: "#4f46e5",
    recommendedAccent: "#06b6d4",
    radius: {
      ios: "1rem",
      iosLg: "1.375rem",
      card: "1.125rem",
      pin: "0.875rem",
    },
    grainOpacity: "0.12",
    light: {
      bg: [245, 247, 251],
      surface: [255, 255, 255],
      surface2: [233, 238, 246],
      surfaceElevated: [255, 255, 255],
      border: [220, 227, 238],
      foreground: [15, 23, 42],
      muted: [88, 100, 119],
      glassBg: "255 255 255 / 0.75",
      glassBgStrong: "255 255 255 / 0.89",
      glassBorder: "255 255 255 / 0.74",
      elevationSoft:
        "0 1px 2px rgb(15 23 42 / 0.04), 0 8px 22px -10px rgb(15 23 42 / 0.07)",
      elevationRaised:
        "0 2px 6px rgb(15 23 42 / 0.06), 0 16px 34px -12px rgb(15 23 42 / 0.13)",
    },
    dark: {
      bg: [9, 13, 22],
      surface: [17, 24, 39],
      surface2: [30, 41, 59],
      surfaceElevated: [38, 51, 73],
      border: [48, 62, 86],
      foreground: [241, 245, 249],
      muted: [160, 173, 192],
      glassBg: "15 22 36 / 0.72",
      glassBgStrong: "15 22 36 / 0.89",
      glassBorder: "226 232 240 / 0.13",
      elevationSoft:
        "inset 0 1px 0 rgb(226 232 240 / 0.06), 0 1px 3px rgb(0 0 0 / 0.4), 0 10px 26px -10px rgb(0 0 0 / 0.6)",
      elevationRaised:
        "inset 0 1px 0 rgb(226 232 240 / 0.09), 0 2px 6px rgb(0 0 0 / 0.45), 0 18px 38px -10px rgb(0 0 0 / 0.7)",
    },
  },
  {
    id: "tactile-zine",
    label: "Tactile Zine",
    badge: "Kreatif",
    description: "Garis struktur tegas, sudut ringkas, dan bayangan geser taktil berkarakter studio seni.",
    recommendedPrimary: "#dc2626",
    recommendedAccent: "#f59e0b",
    radius: {
      ios: "0.75rem",
      iosLg: "1.125rem",
      card: "0.875rem",
      pin: "0.625rem",
    },
    grainOpacity: "0.18",
    light: {
      bg: [251, 249, 242],
      surface: [255, 255, 255],
      surface2: [240, 236, 225],
      surfaceElevated: [255, 255, 255],
      border: [194, 189, 176],
      foreground: [20, 20, 22],
      muted: [88, 88, 94],
      glassBg: "255 253 248 / 0.84",
      glassBgStrong: "255 253 248 / 0.94",
      glassBorder: "20 20 22 / 0.14",
      elevationSoft:
        "0 2px 0 rgb(20 20 22 / 0.09), 0 6px 16px -10px rgb(20 20 22 / 0.08)",
      elevationRaised:
        "0 3px 0 rgb(20 20 22 / 0.14), 0 12px 24px -12px rgb(20 20 22 / 0.12)",
    },
    dark: {
      bg: [14, 14, 16],
      surface: [25, 25, 29],
      surface2: [39, 39, 45],
      surfaceElevated: [48, 48, 56],
      border: [74, 74, 84],
      foreground: [250, 250, 250],
      muted: [176, 176, 184],
      glassBg: "24 24 28 / 0.8",
      glassBgStrong: "24 24 28 / 0.92",
      glassBorder: "255 255 255 / 0.16",
      elevationSoft:
        "inset 0 1px 0 rgb(255 255 255 / 0.07), 0 2px 0 rgb(0 0 0 / 0.55), 0 8px 20px -10px rgb(0 0 0 / 0.55)",
      elevationRaised:
        "inset 0 1px 0 rgb(255 255 255 / 0.1), 0 3px 0 rgb(0 0 0 / 0.65), 0 16px 32px -10px rgb(0 0 0 / 0.65)",
    },
  },
] as const;

const PRESET_MAP = new Map<ThemePresetId, ThemePresetDefinition>(
  THEME_PRESETS.map((preset) => [preset.id, preset]),
);

/** Nilai bawaan tema dalam hex untuk konteks non-CSS (OG, ikon PWA, manifest). */
export const DEFAULT_THEME_HEX = {
  primary: "#e60023",
  lightBackground: "#f2f2f7",
  darkBackground: "#0a0a0c",
} as const;

/**
 * Token tema yang boleh di-override secara langsung dari menu Setting. Nilai =
 * channel RGB (mis. "230 0 35"). Dipakai layout (inject :root) & form Setting.
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

export function isThemePresetId(value: unknown): value is ThemePresetId {
  return typeof value === "string" && PRESET_MAP.has(value as ThemePresetId);
}

export function resolveThemePreset(
  theme: ThemeTokens | null | undefined,
): ThemePresetId {
  const raw = theme?.preset;
  return isThemePresetId(raw) ? raw : DEFAULT_THEME_PRESET;
}

export function getThemePreset(
  id: ThemePresetId | string | null | undefined,
): ThemePresetDefinition {
  if (isThemePresetId(id)) return PRESET_MAP.get(id)!;
  return PRESET_MAP.get(DEFAULT_THEME_PRESET)!;
}

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

function meetsDualContrast(
  candidate: Rgb,
  backgrounds: readonly Rgb[],
  minApca: number,
): boolean {
  return backgrounds.every(
    (bg) =>
      rgbContrastRatio(candidate, bg) >= MIN_TEXT_CONTRAST &&
      Math.abs(apcaContrastLc(candidate, bg)) >= minApca,
  );
}

/**
 * Geser kecerahan perseptual (OKLCH Lightness `L`) seperlunya tanpa mengubah
 * Hue asli warna merek hingga lolos kontras ganda WCAG 2.2 AA & APCA pada
 * seluruh latar (`bg`, `surface`, dan `bg-primary/12`).
 */
function readablePrimaryOklch(
  primary: Rgb,
  backgrounds: readonly Rgb[],
  direction: "darker" | "lighter",
  fallback: Rgb,
): Rgb {
  const minApca = direction === "darker" ? MIN_LIGHT_APCA_LC : MIN_DARK_APCA_LC;
  if (meetsDualContrast(primary, backgrounds, minApca)) return primary;

  const base = rgbToOklch(primary);
  const targetL = direction === "darker" ? 0.14 : 0.92;
  const steps = 80;
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const nextL = base.l + (targetL - base.l) * t;
    // Pertahankan saturasi warna merek agar merah/ungu tidak berubah pucat di mode gelap.
    const chromaScale = direction === "lighter" ? 1 - t * 0.08 : 1 - t * 0.05;
    const candidate = oklchToRgb({
      l: nextL,
      c: Math.max(0, base.c * chromaScale),
      h: base.h,
    });
    if (meetsDualContrast(candidate, backgrounds, minApca)) {
      return candidate;
    }
  }
  return fallback;
}

function withPrimaryTints(backgrounds: readonly Rgb[], primary: Rgb): Rgb[] {
  return [
    ...backgrounds,
    ...backgrounds.map((background) =>
      mixOklabRgb(background, primary, PRIMARY_TINT),
    ),
  ];
}

function primaryStrongOklch(primary: Rgb): Rgb {
  const oklch = rgbToOklch(primary);
  return oklchToRgb({
    l: Math.max(0.18, oklch.l - 0.095),
    c: Math.min(0.32, oklch.c * 1.04),
    h: oklch.h,
  });
}

function darkModeBrandLift(brand: Rgb): Rgb {
  const oklch = rgbToOklch(brand);
  // Di mode gelap, angkat sedikit lightness agar tombol & aksen tidak tenggelam di latar hitam.
  if (oklch.l >= 0.62) return brand;
  return oklchToRgb({
    l: Math.min(0.63, oklch.l + 0.05),
    c: Math.min(0.28, oklch.c),
    h: oklch.h,
  });
}

function primaryForeground(primary: Rgb): Rgb {
  const darkInk: Rgb = [20, 20, 22];
  const lightInk: Rgb = [255, 255, 255];
  const darkScore = Math.abs(apcaContrastLc(darkInk, primary));
  const lightScore = Math.abs(apcaContrastLc(lightInk, primary));
  if (Math.abs(darkScore - lightScore) > 8) {
    return darkScore > lightScore ? darkInk : lightInk;
  }
  return rgbContrastRatio(primary, darkInk) >= rgbContrastRatio(primary, lightInk)
    ? darkInk
    : lightInk;
}

function modeSurfaceDeclarations(tokens: ModeSurfaceTokens): string[] {
  return [
    `--bg:${rgbChannels(tokens.bg)};`,
    `--surface:${rgbChannels(tokens.surface)};`,
    `--surface-2:${rgbChannels(tokens.surface2)};`,
    `--surface-elevated:${rgbChannels(tokens.surfaceElevated)};`,
    `--border:${rgbChannels(tokens.border)};`,
    `--foreground:${rgbChannels(tokens.foreground)};`,
    `--muted:${rgbChannels(tokens.muted)};`,
    `--glass-bg:${tokens.glassBg};`,
    `--glass-bg-strong:${tokens.glassBgStrong};`,
    `--glass-border:${tokens.glassBorder};`,
    `--elevation-soft:${tokens.elevationSoft};`,
    `--elevation-raised:${tokens.elevationRaised};`,
  ];
}

/**
 * Evaluasi kontras merek pada mode terang & gelap preset terpilih untuk
 * ditampilkan langsung pada kartu pratinjau Admin → Pengaturan → Identitas.
 */
export function evaluateBrandContrast(
  primaryHex: string,
  presetId: ThemePresetId = DEFAULT_THEME_PRESET,
): {
  lightRatio: number;
  darkRatio: number;
  lightApca: number;
  darkApca: number;
  lightReadableHex: string;
  darkReadableHex: string;
} {
  const preset = getThemePreset(presetId);
  const primary = parseHexRgb(primaryHex) ?? [230, 0, 35];
  const darkPrimary = darkModeBrandLift(primary);

  const lightBgs = [preset.light.bg, preset.light.surface];
  const darkBgs = [preset.dark.bg, preset.dark.surface];

  const lightReadable = readablePrimaryOklch(
    primary,
    withPrimaryTints(lightBgs, primary),
    "darker",
    preset.light.foreground,
  );
  const darkReadable = readablePrimaryOklch(
    darkPrimary,
    withPrimaryTints(darkBgs, darkPrimary),
    "lighter",
    preset.dark.foreground,
  );

  return {
    lightRatio: Number(rgbContrastRatio(lightReadable, preset.light.surface).toFixed(1)),
    darkRatio: Number(rgbContrastRatio(darkReadable, preset.dark.surface).toFixed(1)),
    lightApca: Math.round(Math.abs(apcaContrastLc(lightReadable, preset.light.surface))),
    darkApca: Math.round(Math.abs(apcaContrastLc(darkReadable, preset.dark.surface))),
    lightReadableHex: rgbChannelsToHex(rgbChannels(lightReadable)),
    darkReadableHex: rgbChannelsToHex(rgbChannels(darkReadable)),
  };
}

/** Bangun CSS `:root{…}.dark{…}` dari theme tersimpan. null bila tak ada override. */
export function themeCss(theme: ThemeTokens | null | undefined): string | null {
  if (!theme) return null;

  const presetId = resolveThemePreset(theme);
  const preset = getThemePreset(presetId);
  const hasCustomPreset = presetId !== DEFAULT_THEME_PRESET;

  const rootLines: string[] = [];
  const darkLines: string[] = [];

  if (hasCustomPreset) {
    rootLines.push(
      ...modeSurfaceDeclarations(preset.light),
      `--surface-radius-ios:${preset.radius.ios};`,
      `--surface-radius-lg:${preset.radius.iosLg};`,
      `--surface-radius-card:${preset.radius.card};`,
      `--surface-radius-pin:${preset.radius.pin};`,
      `--grain-opacity:${preset.grainOpacity};`,
    );
    darkLines.push(...modeSurfaceDeclarations(preset.dark));
  }

  for (const key of THEME_KEYS) {
    const value = normalizeRgbChannels(theme[key]);
    if (value) rootLines.push(`--${key}:${value};`);
  }

  const primary = parseRgbChannels(theme.primary);
  const accent = parseRgbChannels(theme.accent) ?? primary;

  if (primary && accent) {
    const darkPrimary = darkModeBrandLift(primary);
    const darkAccent = darkModeBrandLift(accent);

    const lightBackgrounds: readonly Rgb[] = [
      parseRgbChannels(theme.bg) ?? preset.light.bg,
      parseRgbChannels(theme.surface) ?? preset.light.surface,
    ];
    const darkBackgrounds: readonly Rgb[] = [preset.dark.bg, preset.dark.surface];

    const lightReadable = readablePrimaryOklch(
      primary,
      withPrimaryTints(lightBackgrounds, primary),
      "darker",
      preset.light.foreground,
    );
    const darkReadable = readablePrimaryOklch(
      darkPrimary,
      withPrimaryTints(darkBackgrounds, darkPrimary),
      "lighter",
      preset.dark.foreground,
    );

    const primaryOklch = rgbToOklch(primary);
    const accentOklch = rgbToOklch(accent);
    const darkPrimaryOklch = rgbToOklch(darkPrimary);
    const darkAccentOklch = rgbToOklch(darkAccent);

    // Chroma sedikit diperkaya untuk layar Display P3 tanpa menggeser lightness/hue.
    rootLines.push(
      `--primary-readable:${rgbChannels(lightReadable)};`,
      `--primary-strong:${rgbChannels(primaryStrongOklch(primary))};`,
      `--primary-foreground:${rgbChannels(primaryForeground(primary))};`,
      `--primary-oklch:${formatOklch({ ...primaryOklch, c: Math.min(0.32, primaryOklch.c * 1.06) })};`,
      `--accent-oklch:${formatOklch({ ...accentOklch, c: Math.min(0.32, accentOklch.c * 1.06) })};`,
    );

    darkLines.push(
      `--primary:${rgbChannels(darkPrimary)};`,
      `--accent:${rgbChannels(darkAccent)};`,
      `--primary-readable:${rgbChannels(darkReadable)};`,
      `--primary-strong:${rgbChannels(primaryStrongOklch(darkPrimary))};`,
      `--primary-foreground:${rgbChannels(primaryForeground(darkPrimary))};`,
      `--primary-oklch:${formatOklch({ ...darkPrimaryOklch, c: Math.min(0.3, darkPrimaryOklch.c * 1.05) })};`,
      `--accent-oklch:${formatOklch({ ...darkAccentOklch, c: Math.min(0.3, darkAccentOklch.c * 1.05) })};`,
    );
  }

  if (rootLines.length === 0 && darkLines.length === 0) return null;
  const rootRule = rootLines.length > 0 ? `:root{${rootLines.join("")}}` : "";
  const darkRule = darkLines.length > 0 ? `.dark{${darkLines.join("")}}` : "";
  return `${rootRule}${darkRule}`;
}

/** Hex warna utama tersimpan, atau bawaan preset/template. */
export function themePrimaryHex(
  theme: ThemeTokens | null | undefined,
): string {
  if (theme?.primary) {
    const normalized = normalizeRgbChannels(theme.primary);
    if (normalized) return rgbChannelsToHex(normalized);
  }
  const preset = getThemePreset(resolveThemePreset(theme));
  return preset.recommendedPrimary || DEFAULT_THEME_HEX.primary;
}

/**
 * Warna bilah browser/status = latar aplikasi (pola iOS: bar menyatu dengan
 * konten), mengikuti preset aktif maupun override manual.
 */
export function themeBackgroundHex(theme: ThemeTokens | null | undefined): {
  light: string;
  dark: string;
} {
  const preset = getThemePreset(resolveThemePreset(theme));
  const customBg = normalizeRgbChannels(theme?.bg);
  return {
    light: customBg ? rgbChannelsToHex(customBg) : rgbChannelsToHex(rgbChannels(preset.light.bg)),
    dark: rgbChannelsToHex(rgbChannels(preset.dark.bg)),
  };
}

/** "#E60023" -> "230 0 35" (channel RGB untuk CSS var). null bila tak valid. */
export function hexToRgbChannels(hex: string): string | null {
  const parsed = parseHexRgb(hex);
  return parsed ? rgbChannels(parsed) : null;
}

/** "230 0 35" -> "#e60023" (untuk input color di form Setting). */
export function rgbChannelsToHex(channels: string): string {
  const [r, g, b] = channels.trim().split(/\s+/).map((n) => Number(n));
  const to2 = (n: number) => Math.max(0, Math.min(255, n | 0)).toString(16).padStart(2, "0");
  return `#${to2(r ?? 0)}${to2(g ?? 0)}${to2(b ?? 0)}`;
}
