const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SONGFESS_TAG_SUFFIX_RE =
  /\n?\[lagu:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]\s*$/i;

export const MAX_SONGFESS_TEXT_LENGTH = 450;

export interface ParsedSongfess {
  text: string;
  trackId: string | null;
}

/**
 * Menyematkan penanda lagu terstruktur di akhir isi pesan anonim sehingga
 * Songfess bekerja langsung di atas skema tabel `messages.content` yang ada.
 */
export function encodeSongfessContent(
  rawText: string,
  trackId?: string | null,
): string {
  const cleanText = parseSongfessContent(rawText).text.trim();
  if (!trackId || !UUID_RE.test(trackId)) {
    return cleanText;
  }
  const clipped = cleanText.slice(0, MAX_SONGFESS_TEXT_LENGTH).trimEnd();
  return `${clipped}\n[lagu:${trackId.toLowerCase()}]`;
}

/**
 * Memisahkan isi teks murni pesan anonim dari lampiran ID lagu Songfess.
 */
export function parseSongfessContent(rawContent: string): ParsedSongfess {
  const match = SONGFESS_TAG_SUFFIX_RE.exec(rawContent);
  if (!match) {
    return { text: rawContent.trim(), trackId: null };
  }
  const text = rawContent.slice(0, match.index).trim();
  const trackId = match[1] ? match[1].toLowerCase() : null;
  return {
    text,
    trackId,
  };
}
