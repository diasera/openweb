export type MediaFormatKind = "image" | "video" | "audio";

export type MediaPreparation =
  | "direct"
  | "heic"
  | "native-image"
  | "external"
  | "blocked";

export interface MediaFormatDefinition {
  id: string;
  label: string;
  kind: MediaFormatKind;
  canonicalMime: string;
  mimeAliases: readonly string[];
  extensions: readonly string[];
  storageExtension: string;
  preparation: MediaPreparation;
  editor: "static" | "none";
  compatibility: "portable" | "device-dependent" | "processor-required";
  /**
   * Klaim MIME yang diketahui dipakai OS untuk ekstensi format ini. Daftar ini
   * hanya berlaku saat memilih file; file tetap dinormalisasi ke canonicalMime
   * dan signature byte diverifikasi sebelum disimpan.
   */
  compatibleClaimMimes?: readonly string[];
  /** Format yang lebih spesifik menang saat dua klaim kompatibel bertemu. */
  claimPriority?: number;
  rejectionMessage?: string;
}

const FORMAT_DEFINITIONS = [
  {
    id: "jpeg",
    label: "JPEG",
    kind: "image",
    canonicalMime: "image/jpeg",
    mimeAliases: ["image/pjpeg"],
    extensions: ["jpg", "jpeg", "jfif", "pjpeg", "pjp"],
    storageExtension: "jpg",
    preparation: "direct",
    editor: "static",
    compatibility: "portable",
  },
  {
    id: "png",
    label: "PNG",
    kind: "image",
    canonicalMime: "image/png",
    mimeAliases: [],
    extensions: ["png"],
    storageExtension: "png",
    preparation: "direct",
    editor: "static",
    compatibility: "portable",
    compatibleClaimMimes: ["image/apng"],
  },
  {
    id: "apng",
    label: "APNG",
    kind: "image",
    canonicalMime: "image/apng",
    mimeAliases: [],
    extensions: ["apng"],
    storageExtension: "apng",
    preparation: "direct",
    editor: "none",
    compatibility: "portable",
    compatibleClaimMimes: ["image/png"],
    claimPriority: 10,
  },
  {
    id: "gif",
    label: "GIF",
    kind: "image",
    canonicalMime: "image/gif",
    mimeAliases: [],
    extensions: ["gif"],
    storageExtension: "gif",
    preparation: "direct",
    editor: "none",
    compatibility: "portable",
  },
  {
    id: "webp",
    label: "WebP",
    kind: "image",
    canonicalMime: "image/webp",
    mimeAliases: [],
    extensions: ["webp"],
    storageExtension: "webp",
    preparation: "direct",
    editor: "static",
    compatibility: "portable",
  },
  {
    id: "avif",
    label: "AVIF",
    kind: "image",
    canonicalMime: "image/avif",
    mimeAliases: ["image/avif-sequence"],
    extensions: ["avif"],
    storageExtension: "avif",
    preparation: "direct",
    editor: "static",
    compatibility: "portable",
  },
  {
    id: "heic",
    label: "HEIC",
    kind: "image",
    canonicalMime: "image/heic",
    mimeAliases: ["image/heic-sequence"],
    extensions: ["heic"],
    storageExtension: "jpg",
    preparation: "heic",
    editor: "static",
    compatibility: "device-dependent",
    compatibleClaimMimes: ["image/heif", "image/heif-sequence"],
  },
  {
    id: "heif",
    label: "HEIF",
    kind: "image",
    canonicalMime: "image/heif",
    mimeAliases: ["image/heif-sequence"],
    extensions: ["heif", "hif"],
    storageExtension: "jpg",
    preparation: "heic",
    editor: "static",
    compatibility: "device-dependent",
    compatibleClaimMimes: ["image/heic", "image/heic-sequence"],
  },
  {
    id: "bmp",
    label: "BMP",
    kind: "image",
    canonicalMime: "image/bmp",
    mimeAliases: ["image/x-bmp", "image/x-ms-bmp"],
    extensions: ["bmp", "dib"],
    storageExtension: "jpg",
    preparation: "native-image",
    editor: "static",
    compatibility: "device-dependent",
  },
  {
    id: "tiff",
    label: "TIFF",
    kind: "image",
    canonicalMime: "image/tiff",
    mimeAliases: ["image/x-tiff"],
    extensions: ["tif", "tiff"],
    storageExtension: "jpg",
    preparation: "native-image",
    editor: "static",
    compatibility: "device-dependent",
  },
  {
    id: "jxl",
    label: "JPEG XL",
    kind: "image",
    canonicalMime: "image/jxl",
    mimeAliases: [],
    extensions: ["jxl"],
    storageExtension: "jpg",
    preparation: "native-image",
    editor: "static",
    compatibility: "device-dependent",
  },
  {
    id: "mp4-video",
    label: "MP4/M4V",
    kind: "video",
    canonicalMime: "video/mp4",
    mimeAliases: ["video/x-m4v"],
    extensions: ["mp4", "m4v"],
    storageExtension: "mp4",
    preparation: "direct",
    editor: "none",
    compatibility: "portable",
    compatibleClaimMimes: ["video/quicktime"],
  },
  {
    id: "quicktime",
    label: "QuickTime/MOV",
    kind: "video",
    canonicalMime: "video/quicktime",
    mimeAliases: [],
    extensions: ["mov", "qt"],
    storageExtension: "mov",
    preparation: "direct",
    editor: "none",
    compatibility: "device-dependent",
    compatibleClaimMimes: ["video/mp4", "video/x-m4v"],
  },
  {
    id: "webm-video",
    label: "WebM",
    kind: "video",
    canonicalMime: "video/webm",
    mimeAliases: [],
    extensions: ["webm"],
    storageExtension: "webm",
    preparation: "direct",
    editor: "none",
    compatibility: "portable",
  },
  {
    id: "3gp-video",
    label: "3GP",
    kind: "video",
    canonicalMime: "video/3gpp",
    mimeAliases: ["video/3gpp2"],
    extensions: ["3gp", "3gpp", "3g2"],
    storageExtension: "3gp",
    preparation: "direct",
    editor: "none",
    compatibility: "device-dependent",
  },
  {
    id: "mkv-video",
    label: "Matroska/MKV",
    kind: "video",
    canonicalMime: "video/matroska",
    mimeAliases: ["video/x-matroska"],
    extensions: ["mkv"],
    storageExtension: "mkv",
    preparation: "external",
    editor: "none",
    compatibility: "processor-required",
    rejectionMessage:
      "MKV memerlukan pemroses video untuk membuat MP4/WebM yang kompatibel dengan browser.",
  },
  {
    id: "avi-video",
    label: "AVI",
    kind: "video",
    canonicalMime: "video/x-msvideo",
    mimeAliases: ["video/avi"],
    extensions: ["avi"],
    storageExtension: "avi",
    preparation: "external",
    editor: "none",
    compatibility: "processor-required",
    rejectionMessage:
      "AVI memerlukan pemroses video untuk membuat MP4/WebM yang kompatibel dengan browser.",
  },
  {
    id: "mp3-audio",
    label: "MP3",
    kind: "audio",
    canonicalMime: "audio/mpeg",
    mimeAliases: ["audio/mp3", "audio/x-mpeg"],
    extensions: ["mp3"],
    storageExtension: "mp3",
    preparation: "direct",
    editor: "none",
    compatibility: "portable",
  },
  {
    id: "mp4-audio",
    label: "M4A/AAC dalam MP4",
    kind: "audio",
    canonicalMime: "audio/mp4",
    mimeAliases: ["audio/x-m4a", "audio/mp4a-latm"],
    extensions: ["m4a", "mp4"],
    storageExtension: "m4a",
    preparation: "direct",
    editor: "none",
    compatibility: "portable",
    compatibleClaimMimes: ["video/mp4", "application/mp4"],
  },
  {
    id: "aac-audio",
    label: "AAC",
    kind: "audio",
    canonicalMime: "audio/aac",
    mimeAliases: ["audio/x-aac", "audio/aacp"],
    extensions: ["aac"],
    storageExtension: "aac",
    preparation: "direct",
    editor: "none",
    compatibility: "portable",
  },
  {
    id: "ogg-audio",
    label: "Ogg/Opus",
    kind: "audio",
    canonicalMime: "audio/ogg",
    mimeAliases: ["audio/opus", "audio/vorbis", "application/ogg"],
    extensions: ["ogg", "oga", "opus"],
    storageExtension: "ogg",
    preparation: "direct",
    editor: "none",
    compatibility: "portable",
  },
  {
    id: "webm-audio",
    label: "WebM Audio",
    kind: "audio",
    canonicalMime: "audio/webm",
    mimeAliases: [],
    extensions: ["webm", "weba"],
    storageExtension: "webm",
    preparation: "direct",
    editor: "none",
    compatibility: "portable",
  },
  {
    id: "flac-audio",
    label: "FLAC",
    kind: "audio",
    canonicalMime: "audio/flac",
    mimeAliases: ["audio/x-flac"],
    extensions: ["flac"],
    storageExtension: "flac",
    preparation: "direct",
    editor: "none",
    compatibility: "portable",
  },
  {
    id: "wav-audio",
    label: "WAV",
    kind: "audio",
    canonicalMime: "audio/wav",
    mimeAliases: ["audio/x-wav", "audio/wave", "audio/x-pn-wav"],
    extensions: ["wav", "wave"],
    storageExtension: "wav",
    preparation: "direct",
    editor: "none",
    compatibility: "portable",
  },
  {
    id: "m4p-audio",
    label: "M4P terlindungi",
    kind: "audio",
    canonicalMime: "audio/x-m4p",
    mimeAliases: [],
    extensions: ["m4p"],
    storageExtension: "m4p",
    preparation: "blocked",
    editor: "none",
    compatibility: "processor-required",
    rejectionMessage:
      "M4P biasanya dilindungi FairPlay DRM dan tidak dapat diproses. " +
      "Gunakan salinan DRM-free M4A, AAC, atau MP3.",
  },
  {
    id: "aiff-audio",
    label: "AIFF",
    kind: "audio",
    canonicalMime: "audio/aiff",
    mimeAliases: ["audio/x-aiff"],
    extensions: ["aif", "aiff", "aifc"],
    storageExtension: "aiff",
    preparation: "external",
    editor: "none",
    compatibility: "processor-required",
    rejectionMessage:
      "AIFF perlu dinormalisasi menjadi AAC/Opus/MP3 oleh pemroses media sebelum dipublikasikan.",
  },
  {
    id: "caf-audio",
    label: "Core Audio/CAF",
    kind: "audio",
    canonicalMime: "audio/x-caf",
    mimeAliases: [],
    extensions: ["caf"],
    storageExtension: "caf",
    preparation: "external",
    editor: "none",
    compatibility: "processor-required",
    rejectionMessage:
      "CAF perlu dinormalisasi menjadi AAC/Opus/MP3 oleh pemroses media sebelum dipublikasikan.",
  },
] as const satisfies readonly MediaFormatDefinition[];

export const MEDIA_FORMATS: readonly MediaFormatDefinition[] =
  FORMAT_DEFINITIONS;

const GENERIC_MIME_TYPES = new Set(["", "application/octet-stream"]);

function cleanMime(value: string): string {
  return value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function fileExtension(name: string): string {
  const normalized = name.split(/[\\/]/).pop() ?? "";
  const index = normalized.lastIndexOf(".");
  return index > -1 ? normalized.slice(index + 1).trim().toLowerCase() : "";
}

function formatMimes(format: MediaFormatDefinition): readonly string[] {
  return [format.canonicalMime, ...format.mimeAliases];
}

function acceptsCompatibleClaim(
  format: MediaFormatDefinition,
  mime: string,
): boolean {
  return format.compatibleClaimMimes?.includes(mime) ?? false;
}

function preferredCompatibleFormat(
  extensionFormat: MediaFormatDefinition,
  mimeFormat: MediaFormatDefinition,
): MediaFormatDefinition {
  return (mimeFormat.claimPriority ?? 0) >
    (extensionFormat.claimPriority ?? 0)
    ? mimeFormat
    : extensionFormat;
}

function formatsForKinds(kinds: readonly MediaFormatKind[]) {
  const allowed = new Set(kinds);
  return MEDIA_FORMATS.filter((format) => allowed.has(format.kind));
}

export type MediaFormatResolution =
  | { ok: true; format: MediaFormatDefinition }
  | { ok: false; error: string };

/**
 * Ekstensi hanya petunjuk dan MIME hanya klaim. Keduanya dicocokkan di sini;
 * signature byte tetap diverifikasi terpisah sebelum file dipublikasikan.
 */
export function resolveMediaFormat(
  input: { name: string; type: string },
  kinds: readonly MediaFormatKind[],
): MediaFormatResolution {
  const extension = fileExtension(input.name);
  const mime = cleanMime(input.type);
  if (extension === "img") {
    return {
      ok: false,
      error:
        "File .img adalah citra disk, bukan format foto web. " +
        "Pilih foto HEIC, AVIF, WebP, JPEG, atau PNG.",
    };
  }

  const candidates = formatsForKinds(kinds);
  const extensionFormat = candidates.find((format) =>
    format.extensions.includes(extension as never),
  );
  const mimeFormat = GENERIC_MIME_TYPES.has(mime)
    ? undefined
    : candidates.find((format) =>
        formatMimes(format).some((candidate) => candidate === mime),
      );
  const knownMimeFormat = GENERIC_MIME_TYPES.has(mime)
    ? undefined
    : MEDIA_FORMATS.find((format) =>
        formatMimes(format).some((candidate) => candidate === mime),
      );

  if (extensionFormat?.preparation === "blocked") {
    return {
      ok: false,
      error:
        extensionFormat.rejectionMessage ??
        `${extensionFormat.label} tidak dapat diproses.`,
    };
  }
  if (mimeFormat?.preparation === "blocked") {
    return {
      ok: false,
      error:
        mimeFormat.rejectionMessage ?? `${mimeFormat.label} tidak dapat diproses.`,
    };
  }

  if (extensionFormat && mimeFormat && extensionFormat.id !== mimeFormat.id) {
    if (acceptsCompatibleClaim(extensionFormat, mime)) {
      return {
        ok: true,
        format: preferredCompatibleFormat(extensionFormat, mimeFormat),
      };
    }
    return {
      ok: false,
      error: "Ekstensi dan tipe file tidak cocok. Pilih file media asli.",
    };
  }

  if (
    extensionFormat &&
    !mimeFormat &&
    !GENERIC_MIME_TYPES.has(mime) &&
    knownMimeFormat &&
    !acceptsCompatibleClaim(extensionFormat, mime)
  ) {
    return {
      ok: false,
      error: "Ekstensi dan tipe file tidak cocok. Pilih file media asli.",
    };
  }

  const format = mimeFormat ?? extensionFormat;
  if (!format) {
    return {
      ok: false,
      error:
        "Format media belum dikenali. Jangan hanya mengganti ekstensi file.",
    };
  }
  return { ok: true, format };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function buildAccept(kinds: readonly MediaFormatKind[]): string {
  const formats = formatsForKinds(kinds);
  return unique(
    formats.flatMap((format) => [
      ...formatMimes(format),
      ...format.extensions.map((extension) => `.${extension}`),
    ]),
  ).join(",");
}

function buildStorageMimes(kind: MediaFormatKind): readonly string[] {
  return unique(
    formatsForKinds([kind])
      .filter((format) => format.preparation === "direct")
      .flatMap(formatMimes),
  );
}

export const IMAGE_SOURCE_ACCEPT = buildAccept(["image"]);
export const MEDIA_SOURCE_ACCEPT = buildAccept(["image", "video"]);
export const AUDIO_SOURCE_ACCEPT = buildAccept(["audio"]);

export const IMAGE_STORAGE_MIME_TYPES = buildStorageMimes("image");
export const VIDEO_STORAGE_MIME_TYPES = buildStorageMimes("video");
export const AUDIO_STORAGE_MIME_TYPES = buildStorageMimes("audio");

export const EDITABLE_IMAGE_MIME_TYPES = unique(
  formatsForKinds(["image"])
    .filter(
      (format) =>
        format.preparation === "direct" && format.editor === "static",
    )
    .flatMap(formatMimes),
);

export function storageFormatForMime(
  kind: MediaFormatKind,
  mime: string,
): MediaFormatDefinition | null {
  const cleaned = cleanMime(mime);
  return (
    formatsForKinds([kind]).find(
      (format) =>
        format.preparation === "direct" &&
        formatMimes(format).some((candidate) => candidate === cleaned),
    ) ?? null
  );
}

export function canonicalMimeForFormat(format: MediaFormatDefinition): string {
  return format.canonicalMime;
}
