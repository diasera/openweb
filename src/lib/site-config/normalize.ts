/** Normalisasi daftar teks reusable tanpa membawa schema validator ke browser. */
export function normalizeStringList(values: Iterable<string>, limit: number) {
  const output: string[] = [];
  const known = new Set<string>();

  for (const raw of values) {
    const value = raw.replace(/\s+/g, " ").trim();
    const identity = value.toLocaleLowerCase();
    if (!value || known.has(identity)) continue;

    known.add(identity);
    output.push(value);
    if (output.length >= limit) break;
  }

  return output;
}
