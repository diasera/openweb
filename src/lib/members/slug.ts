import type { MemberRow } from "@/lib/types/database";
import { ADMIN_MANAGED_PATHS } from "@/lib/constants";
import { normalizeSlugSource } from "@/lib/utils/slug";

const SLUG_SEPARATOR = /[^a-z0-9]+/g;
const EDGE_SEPARATOR = /^-+|-+$/g;
const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type MemberWithOptionalSlug = {
  name: string;
  slug?: string | null;
};

const RESERVED_MEMBER_SLUGS = new Set(
  ADMIN_MANAGED_PATHS.flatMap((path) => {
    const segment = path.split("/").filter(Boolean).at(-1);
    return segment ? [segment] : [];
  }),
);

/** Slug ini dimiliki route admin/auth sehingga tidak boleh dipakai profil publik. */
function isReservedMemberSlug(slug: string): boolean {
  return RESERVED_MEMBER_SLUGS.has(slug.trim().toLowerCase());
}

function isUsableStoredSlug(slug: string): boolean {
  return VALID_SLUG.test(slug) && !isReservedMemberSlug(slug);
}

/**
 * Bentuk URL publik anggota dari namanya. Fungsi ini sengaja murni agar
 * aturan slug yang sama dapat dipakai oleh action admin, sitemap, dan UI.
 */
export function slugifyMemberName(name: string): string {
  const slug = normalizeSlugSource(name)
    .replace(SLUG_SEPARATOR, "-")
    .replace(EDGE_SEPARATOR, "");

  return slug || "member";
}

/** Pilih suffix terkecil yang belum dipakai: nama, nama-2, nama-3, dst. */
export function nextAvailableMemberSlug(
  name: string,
  usedSlugs: Iterable<string>,
): string {
  const base = slugifyMemberName(name);
  const used = new Set([
    ...RESERVED_MEMBER_SLUGS,
    ...Array.from(usedSlugs, (slug) => slug.trim().toLowerCase()),
  ]);
  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

/**
 * Compatibility bridge untuk instalasi lama sebelum migration slug dijalankan.
 * Slug tersimpan selalu diutamakan; data lama mendapat slug deterministik dari
 * urutan query sehingga UI dan sitemap tidak pernah menghasilkan `undefined`.
 */
export function ensureMemberSlugs<T extends MemberWithOptionalSlug>(
  members: readonly T[],
): Array<T & { slug: string }> {
  const reserved = new Set(
    members
      .map((member) => member.slug?.trim())
      .filter((slug): slug is string => Boolean(slug && isUsableStoredSlug(slug))),
  );
  const claimed = new Set<string>();

  return members.map((member) => {
    const stored = member.slug?.trim();
    const slug =
      stored && isUsableStoredSlug(stored) && !claimed.has(stored)
        ? stored
        : nextAvailableMemberSlug(member.name, [...reserved, ...claimed]);
    claimed.add(slug);
    return { ...member, slug };
  });
}

export function memberProfilePath(
  member: Pick<MemberRow, "slug">,
): `/profil/${string}` {
  return `/profil/${member.slug}`;
}
