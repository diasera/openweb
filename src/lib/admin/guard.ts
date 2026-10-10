import type { ActionResult } from "@/lib/action-result";
import { isUuid } from "@/lib/utils/id";

/**
 * Argumen Server Action berasal dari klien (bisa dikirim langsung lewat POST),
 * jadi tipe TypeScript bukan jaminan. Satu pemeriksa untuk semua action admin
 * yang menerima id/enum, agar nilai asing ditolak sebelum menyentuh database.
 */
export const INVALID_INPUT: ActionResult = {
  error: "Data tidak valid. Muat ulang halaman lalu coba lagi.",
};

export function isValidId(value: unknown): value is string {
  return typeof value === "string" && isUuid(value);
}

export function isOneOf<const T extends string>(
  value: unknown,
  options: readonly T[],
): value is T {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}
