const IGNORED_NAME_PARTS = new Set([
  "muh",
  "muhammad",
  "moh",
  "mohammad",
  "mohamad",
  "mhd",
]);

/** Bentuk pencarian yang stabil untuk tanda baca, kapital, dan diakritik. */
function normalizeMentionText(value: string) {
  return value
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function memberNameTerms(name: string) {
  const all = normalizeMentionText(name).split(" ").filter(Boolean);
  let parts = all.filter(
    (part) => part.length >= 3 && !IGNORED_NAME_PARTS.has(part),
  );
  if (parts.length === 0) parts = all.filter((part) => part.length >= 2);
  return [...new Set(parts)];
}

/** Cocokkan kata utuh agar “Nur” tidak salah cocok dengan “menurut”. */
export function textMentionsMember(name: string, values: unknown[]) {
  const terms = memberNameTerms(name);
  if (terms.length === 0) return false;
  const haystack = ` ${normalizeMentionText(
    values
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === "string")
      .join(" "),
  )} `;
  return terms.some((term) => haystack.includes(` ${term} `));
}
