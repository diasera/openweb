import "server-only";
import { checkedDatabaseCall, type CheckedMutation } from "./mutation";

type SlugLookup = (slug: string) => PromiseLike<{
  data: { id: string } | null;
  error: { code?: string; message?: string } | null;
}>;

const MAX_SUFFIX = 51;

/**
 * Slug unik per tabel: base, base-2, base-3, … lalu cap waktu sebagai cadangan.
 * `lookup` mencari baris ber-slug tersebut sehingga helper ini tetap bertipe
 * aman untuk tabel mana pun (artikel, album).
 */
export async function findAvailableSlug(
  scope: string,
  base: string,
  excludeId: string | null,
  lookup: SlugLookup,
): Promise<CheckedMutation<string>> {
  let slug = base;
  for (let suffix = 2; suffix <= MAX_SUFFIX; suffix += 1) {
    const result = await checkedDatabaseCall(
      `${scope}.slug`,
      "Gagal memeriksa URL.",
      lookup(slug),
    );
    if (!result.ok) return result;
    if (!result.data || result.data.id === excludeId) {
      return { ok: true, data: slug };
    }
    slug = `${base}-${suffix}`;
  }
  return { ok: true, data: `${base}-${Date.now()}` };
}
