import "server-only";
import { isSlugVariantOf } from "@/lib/utils/slug";
import { checkedDatabaseCall, type CheckedMutation } from "./mutation";

type SlugLookup = (slug: string) => PromiseLike<{
  data: { id: string } | null;
  error: { code?: string; message?: string } | null;
}>;

const MAX_SUFFIX = 51;

/**
 * Slug unik per tabel: base, base-2, base-3, … lalu cap waktu sebagai cadangan.
 * `lookup` mencari baris ber-slug tersebut sehingga helper ini tetap bertipe
 * aman untuk tabel mana pun (artikel, album). `current` (slug baris yang
 * sedang diedit) dipertahankan selama masih varian `base` dan tidak dipakai
 * baris lain, sehingga simpan ulang tanpa ganti judul tidak memindah URL.
 */
export async function findAvailableSlug(
  scope: string,
  base: string,
  excludeId: string | null,
  lookup: SlugLookup,
  current?: string | null,
): Promise<CheckedMutation<string>> {
  if (current && excludeId && isSlugVariantOf(current, base)) {
    const result = await checkedDatabaseCall(
      `${scope}.slug`,
      "Gagal memeriksa URL.",
      lookup(current),
    );
    if (!result.ok) return result;
    if (!result.data || result.data.id === excludeId) {
      return { ok: true, data: current };
    }
  }

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
