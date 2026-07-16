/** Error tabel baru sebelum migrasi diterapkan adalah state deployment, bukan crash. */
export function isMissingRelationError(error: {
  code?: string | null;
  message?: string | null;
}) {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /could not find the table|schema cache/i.test(error.message ?? "")
  );
}
