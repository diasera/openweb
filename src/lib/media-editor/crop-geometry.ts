import { clampNumber } from "./math";

/** Rect crop dalam koordinat unit-square media yang sudah terorientasi. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CropHandle =
  | "move"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "nw";

const EPSILON = 1e-6;
export const DEFAULT_CROP_MIN_SIZE = 0.04;

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function safeMinimum(value: number | undefined, fallback: number): number {
  return clampNumber(finite(value ?? fallback, fallback), EPSILON, 1);
}

function safeAspectRatio(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value <= 0) return null;
  return clampNumber(value, EPSILON, 1 / EPSILON);
}

/**
 * Invariant pusat: x/y/width/height finite, dimensi positif, dan seluruh rect
 * selalu berada di dalam 0..1. Ukuran dipertahankan lalu posisi digeser masuk.
 */
export function clampCropRect(
  rect: CropRect,
  minSize = EPSILON,
): CropRect {
  const minimum = safeMinimum(minSize, EPSILON);
  const width = clampNumber(finite(rect.width, 1), minimum, 1);
  const height = clampNumber(finite(rect.height, 1), minimum, 1);
  return {
    x: clampNumber(finite(rect.x, 0), 0, 1 - width),
    y: clampNumber(finite(rect.y, 0), 0, 1 - height),
    width,
    height,
  };
}

/** Geser tanpa mengubah ukuran; delta non-finite diperlakukan sebagai nol. */
export function moveCropRect(
  start: CropRect,
  deltaX: number,
  deltaY: number,
): CropRect {
  const rect = clampCropRect(start);
  return {
    ...rect,
    x: clampNumber(rect.x + finite(deltaX, 0), 0, 1 - rect.width),
    y: clampNumber(rect.y + finite(deltaY, 0), 0, 1 - rect.height),
  };
}

function freeResize(
  start: CropRect,
  handle: Exclude<CropHandle, "move">,
  deltaX: number,
  deltaY: number,
  minimum: number,
): CropRect {
  let left = start.x;
  let top = start.y;
  let right = start.x + start.width;
  let bottom = start.y + start.height;

  if (handle.includes("w")) {
    left = clampNumber(left + deltaX, 0, right - minimum);
  }
  if (handle.includes("e")) {
    right = clampNumber(right + deltaX, left + minimum, 1);
  }
  if (handle.includes("n")) {
    top = clampNumber(top + deltaY, 0, bottom - minimum);
  }
  if (handle.includes("s")) {
    bottom = clampNumber(bottom + deltaY, top + minimum, 1);
  }

  return clampCropRect(
    { x: left, y: top, width: right - left, height: bottom - top },
    minimum,
  );
}

function ratioMinimumHeight(ratio: number, minimum: number): number {
  // width = ratio * height; kedua sumbu memenuhi minimum jika ruang memadai.
  return Math.max(minimum, minimum / ratio);
}

function cornerResize(
  start: CropRect,
  handle: "ne" | "se" | "sw" | "nw",
  deltaX: number,
  deltaY: number,
  ratio: number,
  minimum: number,
): CropRect {
  const east = handle.includes("e");
  const south = handle.includes("s");
  const directionX = east ? 1 : -1;
  const directionY = south ? 1 : -1;
  const anchorX = east ? start.x : start.x + start.width;
  const anchorY = south ? start.y : start.y + start.height;
  const activeX = (east ? start.x + start.width : start.x) + deltaX;
  const activeY = (south ? start.y + start.height : start.y) + deltaY;
  const rawWidth = directionX * (activeX - anchorX);
  const rawHeight = directionY * (activeY - anchorY);

  // Proyeksi pointer ke garis width = ratio * height membuat kedua axis halus.
  const projectedHeight =
    (ratio * rawWidth + rawHeight) / (ratio * ratio + 1);
  const availableWidth = east ? 1 - anchorX : anchorX;
  const availableHeight = south ? 1 - anchorY : anchorY;
  const maximumHeight = Math.max(
    EPSILON,
    Math.min(availableHeight, availableWidth / ratio),
  );
  const minimumHeight = Math.min(
    maximumHeight,
    ratioMinimumHeight(ratio, minimum),
  );
  const height = clampNumber(
    finite(projectedHeight, minimumHeight),
    minimumHeight,
    maximumHeight,
  );
  const width = ratio * height;

  return clampCropRect(
    {
      x: east ? anchorX : anchorX - width,
      y: south ? anchorY : anchorY - height,
      width,
      height,
    },
  );
}

function horizontalSideResize(
  start: CropRect,
  handle: "e" | "w",
  deltaX: number,
  ratio: number,
  minimum: number,
): CropRect {
  const east = handle === "e";
  const anchorX = east ? start.x : start.x + start.width;
  const activeX = (east ? start.x + start.width : start.x) + deltaX;
  const rawWidth = (east ? 1 : -1) * (activeX - anchorX);
  const availableWidth = east ? 1 - anchorX : anchorX;
  const maximumWidth = Math.max(EPSILON, Math.min(availableWidth, ratio));
  const minimumWidth = Math.min(
    maximumWidth,
    ratio * ratioMinimumHeight(ratio, minimum),
  );
  const width = clampNumber(
    finite(rawWidth, minimumWidth),
    minimumWidth,
    maximumWidth,
  );
  const height = width / ratio;
  const centerY = start.y + start.height / 2;

  return clampCropRect({
    x: east ? anchorX : anchorX - width,
    y: clampNumber(centerY - height / 2, 0, 1 - height),
    width,
    height,
  });
}

function verticalSideResize(
  start: CropRect,
  handle: "n" | "s",
  deltaY: number,
  ratio: number,
  minimum: number,
): CropRect {
  const south = handle === "s";
  const anchorY = south ? start.y : start.y + start.height;
  const activeY = (south ? start.y + start.height : start.y) + deltaY;
  const rawHeight = (south ? 1 : -1) * (activeY - anchorY);
  const availableHeight = south ? 1 - anchorY : anchorY;
  const maximumHeight = Math.max(
    EPSILON,
    Math.min(availableHeight, 1 / ratio),
  );
  const minimumHeight = Math.min(
    maximumHeight,
    ratioMinimumHeight(ratio, minimum),
  );
  const height = clampNumber(
    finite(rawHeight, minimumHeight),
    minimumHeight,
    maximumHeight,
  );
  const width = ratio * height;
  const centerX = start.x + start.width / 2;

  return clampCropRect({
    x: clampNumber(centerX - width / 2, 0, 1 - width),
    y: south ? anchorY : anchorY - height,
    width,
    height,
  });
}

/**
 * Resize dari snapshot pointerdown. `aspectRatio` adalah width/height di ruang
 * normalized; gunakan `normalizedCropAspect` untuk rasio output berbasis pixel.
 */
export function resizeCropRect(
  start: CropRect,
  handle: CropHandle,
  deltaX: number,
  deltaY: number,
  aspectRatio: number | null,
  minSize = DEFAULT_CROP_MIN_SIZE,
): CropRect {
  if (handle === "move") return moveCropRect(start, deltaX, deltaY);

  const minimum = safeMinimum(minSize, DEFAULT_CROP_MIN_SIZE);
  const rect = clampCropRect(start, minimum);
  const dx = finite(deltaX, 0);
  const dy = finite(deltaY, 0);
  const ratio = safeAspectRatio(aspectRatio);
  if (!ratio) return freeResize(rect, handle, dx, dy, minimum);

  if (handle === "e" || handle === "w") {
    return horizontalSideResize(rect, handle, dx, ratio, minimum);
  }
  if (handle === "n" || handle === "s") {
    return verticalSideResize(rect, handle, dy, ratio, minimum);
  }
  return cornerResize(rect, handle, dx, dy, ratio, minimum);
}

/** Rasio output pixel -> rasio width/height dalam koordinat unit-square. */
export function normalizedCropAspect(
  outputAspectRatio: number,
  imageRatio: number,
): number | null {
  const output = safeAspectRatio(outputAspectRatio);
  const image = safeAspectRatio(imageRatio);
  return output && image ? safeAspectRatio(output / image) : null;
}

/** Crop terbesar di tengah yang menghasilkan rasio pixel yang diminta. */
export function largestCenteredCrop(
  aspectRatio: number | null,
  imageRatio: number,
): CropRect {
  if (aspectRatio === null) return { x: 0, y: 0, width: 1, height: 1 };
  const ratio = normalizedCropAspect(aspectRatio, imageRatio);
  if (!ratio) return { x: 0, y: 0, width: 1, height: 1 };

  const width = ratio >= 1 ? 1 : ratio;
  const height = ratio >= 1 ? 1 / ratio : 1;
  return clampCropRect({
    x: (1 - width) / 2,
    y: (1 - height) / 2,
    width,
    height,
  });
}

/** Transformasi normalized untuk rotasi media 90 derajat searah jarum jam. */
export function rotateCropClockwise(rect: CropRect): CropRect {
  const crop = clampCropRect(rect);
  return clampCropRect({
    x: 1 - crop.y - crop.height,
    y: crop.x,
    width: crop.height,
    height: crop.width,
  });
}

/**
 * Skala minimum agar rotasi straighten tidak membuka sudut kosong pada frame
 * berukuran width x height. Main rotation 90 derajat ditangani terpisah.
 */
export function coverScaleForStraighten(
  width: number,
  height: number,
  degrees: number,
): number {
  const safeWidth = finite(width, 0);
  const safeHeight = finite(height, 0);
  if (safeWidth <= 0 || safeHeight <= 0) return 1;

  const imageRatio = clampNumber(
    safeWidth / safeHeight,
    EPSILON,
    1 / EPSILON,
  );
  const radians = (finite(degrees, 0) * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  const scale = cosine + Math.max(imageRatio, 1 / imageRatio) * sine;
  return Number.isFinite(scale) ? Math.max(1, scale) : 1;
}
