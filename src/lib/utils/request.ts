import "server-only";
import { isIP } from "node:net";
import type { DeviceInfo } from "@/lib/types/database";
import { parseUserAgentDevice, type ClientHintsInput } from "./user-agent";

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

function parseForwardedIps(value: string | null): string[] {
  if (!value) return [];
  const ips: string[] = [];
  for (const part of value.split(",").slice(-10)) {
    const ip = normalizeIp(part);
    if (ip) ips.push(ip);
  }
  return ips;
}

/**
 * Ambil hop IP klien dari kanan sesuai jumlah reverse proxy tepercaya di depan
 * server (default 1 = proxy terluar yang langsung meneruskan ke aplikasi).
 * Mengambil elemen paling kiri rentan pemalsuan header `X-Forwarded-For` klien.
 */
function trustedForwardedIp(value: string | null): string | null {
  const ips = parseForwardedIps(value);
  if (ips.length === 0) return null;
  const rawHops = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? "1", 10);
  const hops = Number.isInteger(rawHops) && rawHops >= 1 ? Math.min(rawHops, 10) : 1;
  return ips[Math.max(0, ips.length - hops)] ?? null;
}

/** Apakah aplikasi berjalan di balik platform/reverse proxy yang mensterilkan header? */
export function isBehindTrustedProxy(): boolean {
  return (
    process.env.VERCEL === "1" ||
    process.env.CF_PAGES === "1" ||
    Boolean(process.env.TRUSTED_PROXY?.trim())
  );
}

/**
 * Ambil IP asli pengunjung dari header proxy (Vercel/Cloudflare/nginx).
 * Dipakai ulang oleh endpoint pesan, upload, & tracking pengunjung.
 */
export function getClientIp(headers: Headers): string | null {
  // Vercel menetapkan dan menimpa x-vercel-forwarded-for di edge.
  if (process.env.VERCEL === "1") {
    const vercelIps = parseForwardedIps(headers.get("x-vercel-forwarded-for"));
    return vercelIps[0] ?? null;
  }

  const trustedProxy = process.env.TRUSTED_PROXY?.trim().toLowerCase();
  if (trustedProxy === "cloudflare" || process.env.CF_PAGES === "1") {
    return normalizeIp(headers.get("cf-connecting-ip"));
  }
  if (trustedProxy === "x-real-ip") {
    return normalizeIp(headers.get("x-real-ip"));
  }
  if (trustedProxy === "x-forwarded-for") {
    return trustedForwardedIp(headers.get("x-forwarded-for"));
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

/** Ubah User-Agent (+ opsional Client Hints) menjadi info device lengkap. */
export function parseDevice(
  userAgent: string | null,
  headers?: Headers,
): DeviceInfo | null {
  const normalized = normalizeUserAgent(userAgent);
  const hints: ClientHintsInput | undefined = headers
    ? {
        ua: normalizeUserAgent(headers.get("sec-ch-ua")),
        platform: normalizeUserAgent(headers.get("sec-ch-ua-platform")),
        mobile: normalizeUserAgent(headers.get("sec-ch-ua-mobile")),
      }
    : undefined;
  return parseUserAgentDevice(normalized, hints);
}

/** Ringkasan device untuk ditampilkan admin, mis. "Chrome • Windows • Desktop". */
export function deviceLabel(d: DeviceInfo | null): string {
  if (!d) return "Tidak diketahui";
  const parts = [d.browser, d.os, d.type].filter(Boolean);
  return parts.length ? parts.join(" • ") : "Tidak diketahui";
}
