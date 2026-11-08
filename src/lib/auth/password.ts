import "server-only";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Hash & verifikasi password memakai scrypt bawaan Node (tanpa dependency native).
 * Hanya dipanggil di server action (runtime Node), bukan di middleware/Edge.
 * Format tersimpan: "scrypt$<salt-hex>$<hash-hex>".
 */
const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

// Hash dummy publik (bukan kredensial) untuk menyamakan biaya login username
// yang tidak ada dengan akun yang valid, sehingga timing tidak mengungkap akun.
export const DUMMY_PASSWORD_HASH =
  "scrypt$9dcd261f7b82fe86a09e1cc597a7192e$562c391327ba3c5a34e6cfd4d54f7e58466489246c2945a63482374eb6016b29c3605ca879656bdb238dfbb299fcdc9f18cdf8f8ec0f103b1b173a058d24e54a";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, hashHex] = parts;
  const derived = (await scryptAsync(password, salt!, KEYLEN)) as Buffer;
  const expected = Buffer.from(hashHex!, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}
