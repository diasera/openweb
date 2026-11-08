/** Kontrak hasil aksi yang dipakai bersama Server Action dan komponen klien. */
export type ActionResult = { error?: string };

type ValidationFailure = {
  error: { issues: ReadonlyArray<{ message?: string }> };
};

/** Pesan validasi pertama dengan fallback konsisten untuk form dan route API. */
export function validationErrorMessage(
  result: ValidationFailure,
  fallback = "Data tidak valid",
): string {
  return result.error.issues[0]?.message?.trim() || fallback;
}

/** Ambil pesan error tanpa menganggap nilai asing sebagai hasil yang valid. */
export function getActionError(result: unknown): string | null {
  if (!result || typeof result !== "object" || !("error" in result)) {
    return null;
  }

  const error = (result as { error?: unknown }).error;
  return typeof error === "string" && error.trim() ? error : null;
}
