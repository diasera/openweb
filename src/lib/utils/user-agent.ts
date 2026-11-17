import type { DeviceInfo } from "@/lib/types/database";

export interface ClientHintsInput {
  ua?: string | null;
  platform?: string | null;
  mobile?: string | null;
}

const MAX_UA_SCAN_LENGTH = 512;

const BROWSER_RULES: ReadonlyArray<{
  name: string;
  pattern: RegExp;
}> = [
  { name: "Instagram", pattern: /\bInstagram[\s/]?([\d.]+)?/i },
  { name: "WhatsApp", pattern: /\bWhatsApp\/([\d.]+)/i },
  { name: "LINE", pattern: /\bLine\/([\d.]+)/i },
  { name: "TikTok", pattern: /\b(?:Musical_ly|TikTok|BytedanceWebview)\/([\d.]+)?/i },
  { name: "Facebook", pattern: /\b(?:FBAV|FBAN)\/([\d.]+)?/i },
  { name: "Samsung Internet", pattern: /\bSamsungBrowser\/([\d.]+)/i },
  { name: "Opera", pattern: /\b(?:OPR|OPT|Opera)\/([\d.]+)/i },
  { name: "Edge", pattern: /\b(?:Edg|EdgiOS|EdgA)\/([\d.]+)/i },
  { name: "Vivaldi", pattern: /\bVivaldi\/([\d.]+)/i },
  { name: "Brave", pattern: /\bBrave\/([\d.]+)/i },
  { name: "DuckDuckGo", pattern: /\bDuckDuckGo\/([\d.]+)/i },
  { name: "MIUI Browser", pattern: /\bMiuiBrowser\/([\d.]+)/i },
  { name: "UC Browser", pattern: /\bUCBrowser\/([\d.]+)/i },
  { name: "Firefox", pattern: /\b(?:Firefox|FxiOS)\/([\d.]+)/i },
  { name: "Chrome", pattern: /\b(?:Chrome|CriOS|Chromium)\/([\d.]+)/i },
  { name: "Safari", pattern: /\bVersion\/([\d.]+)(?: Mobile\/\w+)? Safari\//i },
];

function cleanVersion(raw: string | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.replace(/_/g, ".").replace(/[^0-9.]/g, "").replace(/^\.+|\.+$/g, "");
  return normalized ? normalized.slice(0, 24) : null;
}

function detectBrowserFromHints(uaHint: string | null | undefined): {
  name: string;
  version: string | null;
} | null {
  if (!uaHint) return null;
  const trimmed = uaHint.slice(0, MAX_UA_SCAN_LENGTH);
  const preferred = ["Microsoft Edge", "Opera", "Brave", "Vivaldi", "Samsung Internet", "Google Chrome", "Chromium"];
  for (const brand of preferred) {
    const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = new RegExp(`"${escaped}"\\s*;\\s*v="([^"]{1,24})"`, "i").exec(trimmed);
    if (match) {
      const shortName =
        brand === "Microsoft Edge"
          ? "Edge"
          : brand === "Google Chrome"
            ? "Chrome"
            : brand;
      return { name: shortName, version: cleanVersion(match[1]) };
    }
  }
  return null;
}

function detectBrowser(
  ua: string,
  hints?: ClientHintsInput,
): { name: string | null; version: string | null } {
  for (const rule of BROWSER_RULES) {
    const match = rule.pattern.exec(ua);
    if (match) {
      // Jika terdeteksi Chrome generik namun Client Hints menyebut Edge/Brave/Vivaldi, utamakan hint.
      if (rule.name === "Chrome") {
        const hinted = detectBrowserFromHints(hints?.ua);
        if (hinted) return hinted;
      }
      return { name: rule.name, version: cleanVersion(match[1]) };
    }
  }
  const hinted = detectBrowserFromHints(hints?.ua);
  if (hinted) return hinted;
  if (/\bSafari\//i.test(ua) && /\bAppleWebKit\//i.test(ua)) {
    return { name: "Safari", version: null };
  }
  return { name: null, version: null };
}

function detectOs(
  ua: string,
  hints?: ClientHintsInput,
): { name: string | null; version: string | null } {
  const ipadMatch = /\biPad\b.*?OS ([\d_]+)/i.exec(ua);
  if (ipadMatch) return { name: "iPadOS", version: cleanVersion(ipadMatch[1]) };

  const iosMatch = /\b(?:iPhone|iPod)\b.*?(?:iPhone )?OS ([\d_]+)/i.exec(ua);
  if (iosMatch) return { name: "iOS", version: cleanVersion(iosMatch[1]) };

  const androidMatch = /\bAndroid ([\d.]+)/i.exec(ua);
  if (androidMatch) return { name: "Android", version: cleanVersion(androidMatch[1]) };

  const windowsMatch = /\bWindows NT ([\d.]+)/i.exec(ua);
  if (windowsMatch) {
    const nt = windowsMatch[1];
    const version =
      nt === "10.0"
        ? "10/11"
        : nt === "6.3"
          ? "8.1"
          : nt === "6.2"
            ? "8"
            : nt === "6.1"
              ? "7"
              : cleanVersion(nt);
    return { name: "Windows", version };
  }

  const macMatch = /\bMac OS X ([\d_]+)/i.exec(ua);
  if (macMatch) return { name: "macOS", version: cleanVersion(macMatch[1]) };

  if (/\bCrOS\b/i.test(ua)) return { name: "Chrome OS", version: null };
  if (/\bUbuntu\b/i.test(ua)) return { name: "Ubuntu", version: null };
  if (/\bLinux\b/i.test(ua)) return { name: "Linux", version: null };

  const hintedPlatform = hints?.platform?.replace(/"/g, "").trim();
  if (hintedPlatform && hintedPlatform !== "Unknown") {
    return { name: hintedPlatform.slice(0, 24), version: null };
  }
  return { name: null, version: null };
}

function detectDeviceModel(ua: string): string | null {
  if (/\biPhone\b/i.test(ua)) return "Apple iPhone";
  if (/\biPad\b/i.test(ua)) return "Apple iPad";
  if (/\bMacintosh\b/i.test(ua)) return "Apple Mac";

  const pixel = /\b(Pixel(?: [A-Za-z0-9]+){0,3})\b/i.exec(ua);
  if (pixel?.[1]) return `Google ${pixel[1].trim()}`;

  const samsung = /\b(SM-[A-Z0-9]{3,10})\b/i.exec(ua);
  if (samsung?.[1]) return `Samsung ${samsung[1].toUpperCase()}`;

  const androidBuild = /Android [\d.]+;\s*([^;()]{2,36}?)\s+Build\//i.exec(ua);
  if (androidBuild?.[1]) {
    const token = androidBuild[1].trim();
    if (token !== "K" && !/^wv$/i.test(token)) {
      return token;
    }
  }
  return null;
}

function detectDeviceType(ua: string, hints?: ClientHintsInput): string {
  if (/\b(?:bot|crawler|spider|slurp|headlesschrome|lighthouse|facebookexternalhit|whatsapp)\b/i.test(ua)) {
    // Biarkan in-app browser manusia tetap terdeteksi mobile bila memuat AppleWebKit + Mobile.
    if (!/\b(?:Instagram|BytedanceWebview|Line\/|FBAV\/)\b/i.test(ua) && /\b(?:bot|crawler|spider|slurp|headlesschrome|lighthouse|facebookexternalhit)\b/i.test(ua)) {
      return "bot";
    }
  }
  if (/\b(?:iPad|Tablet|PlayBook|Silk)\b/i.test(ua) || (/\bAndroid\b/i.test(ua) && !/\bMobile\b/i.test(ua))) {
    return "tablet";
  }
  if (hints?.mobile === "?1" || /\b(?:Mobile|iPhone|iPod|IEMobile|Opera Mini)\b/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

/**
 * Parser User-Agent + Client Hints internal (100% MIT, bebas dependensi eksternal).
 * Menggantikan pustaka berlisensi AGPL dengan hasil `DeviceInfo` yang identik.
 */
export function parseUserAgentDevice(
  userAgent: string | null,
  hints?: ClientHintsInput,
): DeviceInfo | null {
  const ua = userAgent?.trim().slice(0, MAX_UA_SCAN_LENGTH) ?? "";
  if (!ua && !hints?.ua && !hints?.platform) return null;

  const browser = detectBrowser(ua, hints);
  const os = detectOs(ua, hints);
  const device = detectDeviceModel(ua);
  const type = detectDeviceType(ua, hints);

  return {
    browser: browser.name,
    browserVersion: browser.version,
    os: os.name,
    osVersion: os.version,
    device,
    type,
  };
}
