import "server-only";

type DatabaseError = {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
};

type DatabaseResult<T> = {
  data: T;
  error: DatabaseError | null;
};

type MutationOptions = {
  duplicateMessage?: string;
  notFoundMessage?: string;
};

export type CheckedMutation<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function publicError(
  fallback: string,
  error: DatabaseError,
  options: MutationOptions,
) {
  if (error.code === "23505" && options.duplicateMessage) {
    return options.duplicateMessage;
  }
  if (error.code === "23503") {
    return "Data masih dipakai oleh fitur lain dan belum dapat dihapus.";
  }
  if (error.code === "22P02") {
    return "ID data tidak valid. Muat ulang halaman lalu coba lagi.";
  }
  return fallback;
}

function reportFailure(
  scope: string,
  fallback: string,
  error: DatabaseError,
  options: MutationOptions,
): CheckedMutation<never> {
  console.error(`[database:${scope}] operasi gagal`, {
    code: error.code,
    details: error.details,
    hint: error.hint,
    message: error.message,
  });
  return { ok: false, error: publicError(fallback, error, options) };
}

/** Jalankan operasi database yang cukup diperiksa error-nya. */
export async function checkedDatabaseCall<T>(
  scope: string,
  fallback: string,
  operation: PromiseLike<DatabaseResult<T>>,
  options: MutationOptions = {},
): Promise<CheckedMutation<T>> {
  try {
    const result = await operation;
    if (result.error) return reportFailure(scope, fallback, result.error, options);
    return { ok: true, data: result.data };
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error));
    return reportFailure(scope, fallback, cause, options);
  }
}

/**
 * Mutasi satu baris wajib mengembalikan data lewat `.select(...).maybeSingle()`.
 * Dengan begitu "0 row affected" tidak lagi dilaporkan sebagai sukses palsu.
 */
export async function checkedMutation<T>(
  scope: string,
  fallback: string,
  operation: PromiseLike<DatabaseResult<T>>,
  options: MutationOptions = {},
): Promise<CheckedMutation<NonNullable<T>>> {
  const result = await checkedDatabaseCall(scope, fallback, operation, options);
  if (!result.ok) return result;
  if (result.data !== null && result.data !== undefined) {
    return { ok: true, data: result.data as NonNullable<T> };
  }

  console.warn(`[database:${scope}] mutasi tidak mengenai baris apa pun`);
  return {
    ok: false,
    error:
      options.notFoundMessage ??
      "Data tidak ditemukan atau sudah berubah. Muat ulang halaman lalu coba lagi.",
  };
}
