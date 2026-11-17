/** Kontrak daftar admin berhalaman: semua data bisa dijangkau, bukan dipotong. */
export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  totalPages: number;
}

function normalizePageNumber(page: number): number {
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

export function pageBounds(page: number, size: number) {
  const safePage = normalizePageNumber(page);
  const from = (safePage - 1) * size;
  return { from, to: from + size - 1 };
}

export function toPaged<T>(
  rows: T[],
  total: number | null,
  page: number,
  size: number,
): Paged<T> {
  const count = total ?? rows.length;
  return {
    rows,
    total: count,
    page: normalizePageNumber(page),
    totalPages: Math.max(1, Math.ceil(count / size)),
  };
}
