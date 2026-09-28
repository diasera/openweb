import {
  isSchemaOutdatedError,
  SCHEMA_OUTDATED_MESSAGE,
} from "@/lib/database/errors";

/**
 * Primitive baca bersama lapisan data publik. Error database DILEMPAR, bukan
 * diganti data demo/kosong: ISR tetap menyajikan versi terakhir yang sukses
 * dan error.tsx menawarkan coba lagi. Bagian halaman yang opsional memakai
 * `optionalRead` agar kegagalannya (termasuk skema lama) tidak menjatuhkan halaman.
 */
export type ReadError = { code?: string; message: string };

/** Bentuk respons Supabase: union cabang sukses/gagal. */
export type ReadResult<T> =
  | { data: T; error: null }
  | { data: null; error: ReadError };

/**
 * Tipe data diambil dari cabang sukses saja. Inferensi generik biasa terhadap
 * union ini menyimpulkan hasil `maybeSingle()` sebagai `null`, sehingga
 * pengecekan tipe baris tunggal hilang diam-diam.
 */
export type ReadData<R> = R extends { error: null; data: infer D } ? D : never;

function readFailure(scope: string, error: ReadError): Error {
  return new Error(`[data:${scope}] ${error.code ?? ""} ${error.message}`.trim());
}

export function unwrap<R extends ReadResult<unknown>>(
  scope: string,
  result: R,
): ReadData<R> | null {
  const { data, error } = result as ReadResult<unknown>;
  if (error) throw readFailure(scope, error);
  return data as ReadData<R> | null;
}

/**
 * Untuk fitur yang tabel/fungsinya baru ditambahkan schema.sql: sebelum SQL
 * dijalankan, fitur dianggap kosong alih-alih menjatuhkan halaman atau build.
 */
export function unwrapFeature<R extends ReadResult<unknown>, E>(
  scope: string,
  result: R,
  empty: E,
): NonNullable<ReadData<R>> | E {
  const { error } = result as ReadResult<unknown>;
  if (error && isSchemaOutdatedError(error)) {
    console.warn(`[data:${scope}] ${SCHEMA_OUTDATED_MESSAGE}`);
    return empty;
  }
  return unwrap(scope, result) ?? empty;
}

export function unwrapCount(
  scope: string,
  result: { count: number | null; error: ReadError | null },
): number {
  if (result.error) throw readFailure(scope, result.error);
  return result.count ?? 0;
}

export async function optionalRead<T>(
  scope: string,
  read: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.error(`[data:${scope}] bagian opsional dilewati`, {
      message: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Hanya slug kanonis yang boleh dipakai mencari alias URL lama. */
export function isLookupSlug(value: string): boolean {
  return value.length <= 120 && SLUG_PATTERN.test(value);
}
