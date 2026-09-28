type DatabaseErrorLike = {
  code?: string | null;
  message?: string | null;
};

/** Satu pesan untuk semua gejala skema lama agar instruksi perbaikannya konsisten. */
export const SCHEMA_OUTDATED_MESSAGE =
  "Skema database belum diperbarui. Jalankan ulang supabase/schema.sql di SQL Editor Supabase.";

/** Error tabel baru sebelum migrasi diterapkan adalah state deployment, bukan crash. */
export function isMissingRelationError(error: DatabaseErrorLike) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /could not find the table|schema cache/i.test(error.message ?? "")
  );
}

/** Tabel, kolom, atau fungsi RPC dari schema.sql terbaru belum tersedia. */
export function isSchemaOutdatedError(error: DatabaseErrorLike) {
  return (
    isMissingRelationError(error) ||
    error.code === "42703" || // undefined_column
    error.code === "42883" || // undefined_function
    error.code === "PGRST202" || // fungsi tidak ada di schema cache
    error.code === "PGRST204" // kolom tidak ada di schema cache
  );
}
