/**
 * Sumber tunggal pola UUID RFC 9562 (versi 1–8, varian 10xx) — selaras dengan
 * `z.uuid()` Zod 4 sehingga id yang lolos validasi action juga lolos di sini.
 * Diekspor sebagai string agar bisa dirangkai ke regex lain (path storage).
 */
export const UUID_REGEX_SOURCE =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

const UUID_PATTERN = new RegExp(`^${UUID_REGEX_SOURCE}$`, "i");

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
