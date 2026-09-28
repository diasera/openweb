import type { CropRect } from "./crop-geometry";
import { EDITABLE_IMAGE_MIME_TYPES } from "@/lib/media-formats/registry";

export interface MediaEditorDimensions {
  width: number;
  height: number;
}

export type PhotoFilterId =
  | "none"
  | "vivid"
  | "dramatic"
  | "mono"
  | "noir"
  | "warm"
  | "cool";

export interface PhotoAdjustments {
  /** Semua nilai selain vignette berada pada rentang -100..100. */
  exposure: number;
  brightness: number;
  contrast: number;
  highlights: number;
  shadows: number;
  saturation: number;
  warmth: number;
  /** Vignette berada pada rentang 0..100. */
  vignette: number;
}

/** Recipe normalized dan non-destruktif; tidak bergantung ukuran viewport. */
export interface PhotoEditRecipe {
  crop: CropRect;
  /** Rotasi utama selalu dinormalisasi ke 0, 90, 180, atau 270. */
  rotation: number;
  /** Koreksi horizon halus dalam derajat. */
  straighten: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
  adjustments: PhotoAdjustments;
  filter: PhotoFilterId;
}

export type PhotoAspectId =
  | "original"
  | "free"
  | "1:1"
  | "4:5"
  | "3:4"
  | "2:3"
  | "5:7"
  | "9:16"
  | "16:9"
  | "1200:630";

export interface PhotoAspectOption {
  id: PhotoAspectId;
  label: string;
  /** null berarti freeform, "original" mengikuti media terorientasi. */
  ratio: number | "original" | null;
}

/**
 * Kontrak tunggal editor, pratinjau, dan renderer untuk aset bertujuan khusus.
 * Pipeline menormalkan file baru ke `aspectRatio`; `objectFit` menjadi aturan
 * aman bagi aset lama serta membedakan logo transparan dari foto penuh.
 */
export interface PhotoDestinationFrame {
  aspectRatio: number;
  objectFit: "contain" | "cover";
}

export type PhotoOutputMime = "image/jpeg" | "image/png" | "image/webp";

export interface PhotoEditorProfile {
  id: string;
  aspects: readonly PhotoAspectOption[];
  initialAspect: PhotoAspectId;
  /** Tidak diisi untuk media bebas/masonry dan gambar isi artikel. */
  frame?: PhotoDestinationFrame;
  maxOutputDimension: number;
  maxDecodeDimension?: number;
  quality: number;
  outputMime?: PhotoOutputMime;
  matte?: string;
}

export interface BoundedImagePreview {
  blob: Blob;
  width: number;
  height: number;
}

export interface ExportedPhoto {
  file: File;
  width: number;
  height: number;
  /** Opsional agar pemilih dapat membuka ulang edit dari file asli tanpa re-encode. */
  recipe?: PhotoEditRecipe;
  aspect?: PhotoAspectId;
}

export interface PreviewOptions {
  maxDimension?: number;
  quality?: number;
  sourceDimensions?: MediaEditorDimensions | null;
  signal?: AbortSignal;
}

export interface ExportPhotoOptions {
  sourceDimensions?: MediaEditorDimensions | null;
  maxDecodeDimension?: number;
  maxOutputDimension?: number;
  quality?: number;
  outputMime?: PhotoOutputMime;
  matte?: string;
  signal?: AbortSignal;
}

export const DEFAULT_PHOTO_RECIPE: PhotoEditRecipe = {
  crop: { x: 0, y: 0, width: 1, height: 1 },
  rotation: 0,
  straighten: 0,
  flipHorizontal: false,
  flipVertical: false,
  adjustments: {
    exposure: 0,
    brightness: 0,
    contrast: 0,
    highlights: 0,
    shadows: 0,
    saturation: 0,
    warmth: 0,
    vignette: 0,
  },
  filter: "none",
};

export const EDITABLE_PHOTO_MIME_TYPES = EDITABLE_IMAGE_MIME_TYPES;

/** GIF/video tidak diraster diam-diam menjadi satu frame. */
export function canEditPhoto(file: File | null): boolean {
  return Boolean(
    file &&
      (EDITABLE_PHOTO_MIME_TYPES as readonly string[]).includes(file.type),
  );
}
