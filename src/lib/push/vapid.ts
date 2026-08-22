import "server-only";

/** Konfigurasi VAPID untuk Web Push. Bila env belum diisi, fitur push mati
 *  dengan anggun dan lonceng tetap berfungsi sebagai daftar in-app. */
export interface VapidConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

let cached: VapidConfig | null | undefined;

export function getVapidConfig(): VapidConfig | null {
  if (cached !== undefined) return cached;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@example.com";
  cached =
    publicKey && privateKey ? { publicKey, privateKey, subject } : null;
  return cached;
}

export function isPushConfigured(): boolean {
  return getVapidConfig() !== null;
}
