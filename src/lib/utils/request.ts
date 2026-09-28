import "server-only";
import { isIP } from "node:net";
import { UAParser } from "ua-parser-js";
import type { DeviceInfo } from "@/lib/types/database";

const MAX_USER_AGENT_LENGTH = 512;

function normalizeIp(value: string | null): string | null {
  if (!value) return null;
  let candidate = value.trim();
  if (!candidate || candidate.length > 64) return null;

  // Beberapa proxy lama menambahkan port. Header platform modern tidak.
  const bracketed = /^\[([^\]]+)](?::\d{1,5})?$/.exec(candidate);
  if (bracketed) candidate = bracketed[1]!;
  if (!isIP(candidate)) {
    const ipv4WithPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d{1,5}$/.exec(candidate);
    if (ipv4WithPort) candidate = ipv4WithPort[1]!;
  }
  if (!isIP(candidate)) return null;

  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(candidate);
  return (mapped?.[1] ?? candidate).toLowerCase();
}

function firstForwardedIp(value: string | null): string | null {
  if (!value) return null;
  for (const part of value.split(",").slice(0, 10)) {
    const ip = normalizeIp(part);
    if (ip) return ip;
  }
  return null;
}

/**
 * Ambil IP asli pengunjung dari header proxy (Vercel/Cloudflare/nginx).
 * Dipakai ulang oleh endpoint pesan, upload, & tracking pengunjung.
 */
export function getClientIp(headers: Headers): string | null {
  // Vercel menetapkan x-vercel-forwarded-for di edge. Jangan membiarkan XFF
  // generik yang dikirim klien mengalahkannya.
  if (process.env.VERCEL === "1") {
    return (
      firstForwardedIp(headers.get("x-vercel-forwarded-for")) ??
      firstForwardedIp(headers.get("x-forwarded-for"))
    );
  }

  const trustedProxy = process.env.TRUSTED_PROXY?.trim().toLowerCase();
  if (trustedProxy === "cloudflare" || process.env.CF_PAGES === "1") {
    return normalizeIp(headers.get("cf-connecting-ip"));
  }
  if (trustedProxy === "x-real-ip") {
    return normalizeIp(headers.get("x-real-ip"));
  }
  if (trustedProxy === "x-forwarded-for") {
    return firstForwardedIp(headers.get("x-forwarded-for"));
  }

  // Tanpa proxy tepercaya, lebih aman tidak menetapkan IP daripada menerima
  // header yang dapat dipalsukan langsung oleh klien.
  return null;
}

/** Batasi metadata request sebelum parsing maupun penyimpanan database. */
function normalizeUserAgent(value: string | null): string | null {
  if (!value) return null;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_USER_AGENT_LENGTH);
  return normalized || null;
}

export function getUserAgent(headers: Headers): string | null {
  return normalizeUserAgent(headers.get("user-agent"));
}

/** Ubah User-Agent menjadi info device lengkap (browser, OS, tipe, model). */
export function parseDevice(userAgent: string | null): DeviceInfo | null {
  const normalized = normalizeUserAgent(userAgent);
  if (!normalized) return null;
  const r = new UAParser(normalized).getResult();
  const device = [r.device.vendor, r.device.model].filter(Boolean).join(" ");
  return {
    browser: r.browser.name ?? null,
    browserVersion: r.browser.version ?? null,
    os: r.os.name ?? null,
    osVersion: r.os.version ?? null,
    device: device || null,
    type: r.device.type ?? "desktop",
  };
}

/** Ringkasan device untuk ditampilkan admin, mis. "Chrome • Windows • Desktop". */
export function deviceLabel(d: DeviceInfo | null): string {
  if (!d) return "Tidak diketahui";
  const parts = [d.browser, d.os, d.type].filter(Boolean);
  return parts.length ? parts.join(" • ") : "Tidak diketahui";
}
