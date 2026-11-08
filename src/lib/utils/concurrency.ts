/**
 * Jalankan tugas async dengan batas paralel; urutan hasil mengikuti input.
 * Dipakai persiapan media (HEIC/preview) dan unggahan carousel agar cepat
 * tanpa membanjiri CPU ponsel atau koneksi.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        results[index] = await task(items[index], index);
      }
    },
  );
  await Promise.all(workers);
  return results;
}
