/** Cocokkan token ASCII tanpa membuat string sementara dari byte file. */
export function hasAscii(
  bytes: Uint8Array,
  offset: number,
  value: string,
): boolean {
  if (offset < 0 || offset + value.length > bytes.length) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (bytes[offset + index] !== value.charCodeAt(index)) return false;
  }
  return true;
}
