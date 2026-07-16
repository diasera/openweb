import { largestCenteredCrop } from "./crop-geometry";
import {
  DEFAULT_PHOTO_RECIPE,
  type MediaEditorDimensions,
  type PhotoAspectId,
  type PhotoAspectOption,
  type PhotoDestinationFrame,
  type PhotoEditRecipe,
  type PhotoEditorProfile,
} from "./types";

const ASPECTS = {
  original: { id: "original", label: "Asli", ratio: "original" },
  free: { id: "free", label: "Bebas", ratio: null },
  square: { id: "1:1", label: "1:1", ratio: 1 },
  portrait: { id: "4:5", label: "4:5", ratio: 4 / 5 },
  threeFour: { id: "3:4", label: "3:4", ratio: 3 / 4 },
  twoThree: { id: "2:3", label: "2:3", ratio: 2 / 3 },
  fiveSeven: { id: "5:7", label: "5:7", ratio: 5 / 7 },
  story: { id: "9:16", label: "9:16", ratio: 9 / 16 },
  landscape: { id: "16:9", label: "16:9", ratio: 16 / 9 },
  social: { id: "1200:630", label: "Sosial", ratio: 1200 / 630 },
} as const satisfies Record<string, PhotoAspectOption>;

const DEFAULT_ASPECTS = [
  ASPECTS.original,
  ASPECTS.free,
  ASPECTS.square,
  ASPECTS.portrait,
  ASPECTS.threeFour,
  ASPECTS.twoThree,
  ASPECTS.fiveSeven,
  ASPECTS.story,
  ASPECTS.landscape,
] as const;

export const PHOTO_EDITOR_PROFILES = {
  media: {
    id: "media",
    aspects: DEFAULT_ASPECTS,
    initialAspect: "original",
    maxOutputDimension: 2048,
    quality: 0.92,
    outputMime: "image/webp",
  },
  "site-logo": {
    id: "site-logo",
    aspects: [ASPECTS.square],
    initialAspect: "1:1",
    frame: { aspectRatio: ASPECTS.square.ratio, objectFit: "contain" },
    maxOutputDimension: 1024,
    quality: 0.94,
    outputMime: "image/png",
  },
  "site-favicon": {
    id: "site-favicon",
    aspects: [ASPECTS.square],
    initialAspect: "1:1",
    frame: { aspectRatio: ASPECTS.square.ratio, objectFit: "contain" },
    maxOutputDimension: 512,
    quality: 1,
    outputMime: "image/png",
  },
  "site-hero": {
    id: "site-hero",
    // Hero mengikuti rasio file final. Crop Asli/Bebas/preset adalah keputusan
    // pengguna dan renderer publik tidak boleh memotongnya untuk kedua kali.
    aspects: DEFAULT_ASPECTS,
    initialAspect: "original",
    maxOutputDimension: 2048,
    quality: 0.92,
    outputMime: "image/webp",
  },
  "site-seo": {
    id: "site-seo",
    aspects: [ASPECTS.social],
    initialAspect: "1200:630",
    frame: { aspectRatio: ASPECTS.social.ratio, objectFit: "contain" },
    maxOutputDimension: 2048,
    quality: 0.92,
    outputMime: "image/webp",
  },
  "blog-cover": {
    id: "blog-cover",
    aspects: [ASPECTS.landscape],
    initialAspect: "16:9",
    frame: { aspectRatio: ASPECTS.landscape.ratio, objectFit: "cover" },
    maxOutputDimension: 2048,
    quality: 0.92,
    outputMime: "image/webp",
  },
  "member-avatar": {
    id: "member-avatar",
    aspects: [ASPECTS.square],
    initialAspect: "1:1",
    frame: { aspectRatio: ASPECTS.square.ratio, objectFit: "cover" },
    maxOutputDimension: 1024,
    quality: 0.94,
    outputMime: "image/webp",
  },
  "article-image": {
    id: "article-image",
    aspects: DEFAULT_ASPECTS,
    initialAspect: "original",
    maxOutputDimension: 2048,
    quality: 0.92,
    outputMime: "image/webp",
  },
} as const satisfies Record<string, PhotoEditorProfile>;

export type PhotoEditorProfileId = keyof typeof PHOTO_EDITOR_PROFILES;

/** Profil ber-frame diturunkan dari sumber profil agar daftarnya tidak ganda. */
export type PhotoDestinationProfileId = {
  [ProfileId in PhotoEditorProfileId]: (typeof PHOTO_EDITOR_PROFILES)[ProfileId] extends {
    readonly frame: PhotoDestinationFrame;
  }
    ? ProfileId
    : never;
}[PhotoEditorProfileId];

export function getPhotoDestinationFrame(
  profile: PhotoDestinationProfileId,
): PhotoDestinationFrame {
  return PHOTO_EDITOR_PROFILES[profile].frame;
}

export function getPhotoEditorProfile(
  profile?: PhotoEditorProfile | PhotoEditorProfileId,
): PhotoEditorProfile {
  if (!profile) return PHOTO_EDITOR_PROFILES.media;
  return typeof profile === "string" ? PHOTO_EDITOR_PROFILES[profile] : profile;
}

export function findAspect(
  profile: PhotoEditorProfile,
  id: PhotoAspectId,
): PhotoAspectOption {
  return (
    profile.aspects.find((option) => option.id === id) ?? profile.aspects[0]
  );
}

function cloneDefaultRecipe(): PhotoEditRecipe {
  return {
    ...DEFAULT_PHOTO_RECIPE,
    crop: { ...DEFAULT_PHOTO_RECIPE.crop },
    adjustments: { ...DEFAULT_PHOTO_RECIPE.adjustments },
  };
}

export function orientedDimensions(
  dimensions: MediaEditorDimensions,
  rotation: number,
): MediaEditorDimensions {
  const quarterTurns = Math.abs(Math.round(rotation / 90)) % 2;
  return quarterTurns
    ? { width: dimensions.height, height: dimensions.width }
    : dimensions;
}

export function resolveAspectRatio(
  option: PhotoAspectOption,
  dimensions: MediaEditorDimensions,
  rotation: number,
): number | null {
  if (option.ratio === null) return null;
  if (option.ratio !== "original") return option.ratio;
  const oriented = orientedDimensions(dimensions, rotation);
  return oriented.width / oriented.height;
}

/** Recipe awal tunggal untuk UI editor dan normalisasi otomatis field aset. */
export function createDefaultPhotoEdit(
  profile: PhotoEditorProfile,
  dimensions: MediaEditorDimensions,
): { aspect: PhotoAspectId; recipe: PhotoEditRecipe } {
  const aspect = findAspect(profile, profile.initialAspect);
  const ratio = resolveAspectRatio(aspect, dimensions, 0);
  return {
    aspect: aspect.id,
    recipe: {
      ...cloneDefaultRecipe(),
      crop: largestCenteredCrop(
        ratio,
        dimensions.width / dimensions.height,
      ),
    },
  };
}

/** Bandingkan rasio dalam ruang pixel agar pembulatan satu pixel tetap valid. */
export function dimensionsMatchDestinationFrame(
  dimensions: MediaEditorDimensions,
  frame: PhotoDestinationFrame,
  pixelTolerance = 1,
): boolean {
  if (
    !Number.isFinite(dimensions.width) ||
    !Number.isFinite(dimensions.height) ||
    dimensions.width <= 0 ||
    dimensions.height <= 0 ||
    !Number.isFinite(frame.aspectRatio) ||
    frame.aspectRatio <= 0
  ) {
    return false;
  }
  const tolerance = Math.max(0, pixelTolerance);
  const widthError = Math.abs(
    dimensions.width - dimensions.height * frame.aspectRatio,
  );
  const heightError = Math.abs(
    dimensions.height - dimensions.width / frame.aspectRatio,
  );
  return Math.min(widthError, heightError) <= tolerance;
}
