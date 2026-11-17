/**
 * Pemeriksa bentuk dokumen ProseMirror/TipTap bersama antara server (`content.ts`)
 * dan browser (`PostEditor` / `RichEditor`), mencegah crash saat data JSON rusak.
 */
export function isProseMirrorDoc(
  value: unknown,
): value is { type: "doc"; content: unknown[] } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as { type?: unknown }).type === "doc" &&
    Array.isArray((value as { content?: unknown }).content)
  );
}
