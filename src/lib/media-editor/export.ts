import {
  boundedDimensions,
  canvasToBlob,
  EDITOR_DECODE_MAX_DIMENSION,
  EDITOR_OUTPUT_MAX_DIMENSION,
  releaseCanvas,
  renderFileToBoundedCanvas,
  throwIfAborted,
} from "./image";
import { createCanvas } from "./canvas";
import { clampCropRect, coverScaleForStraighten } from "./crop-geometry";
import { resolvedPhotoAdjustments } from "./filters";
import { clampNumber } from "./math";
import {
  DEFAULT_PHOTO_RECIPE,
  type ExportedPhoto,
  type ExportPhotoOptions,
  type MediaEditorDimensions,
  type PhotoEditRecipe,
  type PhotoEditorProfile,
} from "./types";

function normalizedQuarterRotation(rotation: number): number {
  return (((Math.round(rotation / 90) % 4) + 4) % 4) * 90;
}

function extensionForMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function editedFileName(name: string, mime: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim() || "foto";
  return `${base}-edited.${extensionForMime(mime)}`;
}

function recipeIsIdentity(recipe: PhotoEditRecipe): boolean {
  return JSON.stringify(recipe) === JSON.stringify(DEFAULT_PHOTO_RECIPE);
}

/**
 * Satu pintu export berbasis profile. Sumber hanya dipakai ulang bila recipe,
 * batas dimensi, dan MIME sudah memenuhi kontrak output profile.
 */
export function exportPhotoForProfile(
  sourceFile: File,
  recipe: PhotoEditRecipe,
  sourceDimensions: MediaEditorDimensions,
  profile: PhotoEditorProfile,
  signal?: AbortSignal,
): Promise<ExportedPhoto> {
  throwIfAborted(signal);
  const canReuseSource =
    recipeIsIdentity(recipe) &&
    Math.max(sourceDimensions.width, sourceDimensions.height) <=
      profile.maxOutputDimension &&
    (!profile.outputMime || profile.outputMime === sourceFile.type);
  if (canReuseSource) {
    return Promise.resolve({
      file: sourceFile,
      width: sourceDimensions.width,
      height: sourceDimensions.height,
    });
  }
  return exportEditedPhoto(sourceFile, recipe, {
    sourceDimensions,
    maxDecodeDimension: profile.maxDecodeDimension,
    maxOutputDimension: profile.maxOutputDimension,
    quality: profile.quality,
    outputMime: profile.outputMime,
    matte: profile.matte,
    signal,
  });
}

/**
 * Renderer pixel final sengaja terpusat. Preview memakai CSS agar gesture tetap
 * 60fps; loop ini hanya berjalan satu kali ketika pengguna menekan Selesai.
 */
async function applyPhotoAdjustments(
  canvas: HTMLCanvasElement,
  recipe: PhotoEditRecipe,
  signal?: AbortSignal,
): Promise<void> {
  const values = resolvedPhotoAdjustments(recipe);
  if (Object.values(values).every((value) => value === 0)) return;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas tidak tersedia di browser ini.");
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = image.data;
  const exposure = 2 ** ((values.exposure / 100) * 1.15);
  const brightness = (values.brightness / 100) * 72;
  const contrast = 1 + values.contrast / 100;
  const saturation = 1 + values.saturation / 100;
  const warmth = values.warmth / 100;
  const shadows = values.shadows / 100;
  const highlights = values.highlights / 100;
  const vignette = values.vignette / 100;
  const widthDenominator = Math.max(1, canvas.width - 1);
  const heightDenominator = Math.max(1, canvas.height - 1);

  for (let y = 0; y < canvas.height; y += 1) {
    if (y % 64 === 0) {
      throwIfAborted(signal);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
    const normalizedY = (y / heightDenominator - 0.5) * 2;
    for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4;
      if (pixels[index + 3] === 0) continue;
      let red = pixels[index] * exposure + brightness;
      let green = pixels[index + 1] * exposure + brightness;
      let blue = pixels[index + 2] * exposure + brightness;
      red = (red - 128) * contrast + 128;
      green = (green - 128) * contrast + 128;
      blue = (blue - 128) * contrast + 128;
      const light = clampNumber(
        (red * 0.299 + green * 0.587 + blue * 0.114) / 255,
        0,
        1,
      );
      const tonal =
        shadows * 64 * (1 - light) ** 2 + highlights * 64 * light ** 2;
      red += tonal;
      green += tonal;
      blue += tonal;
      const gray = red * 0.299 + green * 0.587 + blue * 0.114;
      red = gray + (red - gray) * saturation + warmth * 30;
      green = gray + (green - gray) * saturation + warmth * 4;
      blue = gray + (blue - gray) * saturation - warmth * 30;
      if (vignette > 0) {
        const normalizedX = (x / widthDenominator - 0.5) * 2;
        const distance = Math.hypot(normalizedX, normalizedY);
        const shade =
          1 - clampNumber((distance - 0.32) * vignette * 0.5, 0, 0.72);
        red *= shade;
        green *= shade;
        blue *= shade;
      }
      pixels[index] = clampNumber(Math.round(red), 0, 255);
      pixels[index + 1] = clampNumber(Math.round(green), 0, 255);
      pixels[index + 2] = clampNumber(Math.round(blue), 0, 255);
    }
  }
  throwIfAborted(signal);
  context.putImageData(image, 0, 0);
}

/**
 * Mengekspor recipe yang sama untuk Pin, aset situs, anggota, dan blog.
 * Straighten memakai auto-cover sehingga tidak pernah menghasilkan sudut kosong.
 */
async function exportEditedPhoto(
  sourceFile: File,
  recipe: PhotoEditRecipe,
  options: ExportPhotoOptions = {},
): Promise<ExportedPhoto> {
  const signal = options.signal;
  const outputMime =
    options.outputMime ??
    (sourceFile.type === "image/png" ? "image/png" : "image/webp");
  const preserveAlpha = outputMime !== "image/jpeg";
  const matte = options.matte ?? "#ffffff";
  const source = await renderFileToBoundedCanvas(
    sourceFile,
    options.maxDecodeDimension ?? EDITOR_DECODE_MAX_DIMENSION,
    options.sourceDimensions,
    signal,
  );
  let transformed: HTMLCanvasElement | null = null;
  let output: HTMLCanvasElement | null = null;

  try {
    throwIfAborted(signal);
    const rotation = normalizedQuarterRotation(recipe.rotation);
    const quarterTurn = rotation === 90 || rotation === 270;
    const baseWidth = quarterTurn ? source.height : source.width;
    const baseHeight = quarterTurn ? source.width : source.height;
    transformed = createCanvas(baseWidth, baseHeight);
    const transformedContext = transformed.getContext("2d", {
      alpha: preserveAlpha,
    });
    if (!transformedContext) {
      throw new Error("Canvas tidak tersedia di browser ini.");
    }
    if (!preserveAlpha) {
      transformedContext.fillStyle = matte;
      transformedContext.fillRect(0, 0, baseWidth, baseHeight);
    }
    transformedContext.imageSmoothingEnabled = true;
    transformedContext.imageSmoothingQuality = "high";
    transformedContext.translate(baseWidth / 2, baseHeight / 2);
    transformedContext.rotate((recipe.straighten * Math.PI) / 180);
    const coverScale = coverScaleForStraighten(
      baseWidth,
      baseHeight,
      recipe.straighten,
    );
    transformedContext.scale(
      coverScale * (recipe.flipHorizontal ? -1 : 1),
      coverScale * (recipe.flipVertical ? -1 : 1),
    );
    transformedContext.rotate((rotation * Math.PI) / 180);
    transformedContext.drawImage(source, -source.width / 2, -source.height / 2);
    transformedContext.setTransform(1, 0, 0, 1, 0, 0);

    const crop = clampCropRect(recipe.crop);
    const cropX = Math.round(crop.x * baseWidth);
    const cropY = Math.round(crop.y * baseHeight);
    const cropWidth = Math.max(
      1,
      Math.min(baseWidth - cropX, Math.round(crop.width * baseWidth)),
    );
    const cropHeight = Math.max(
      1,
      Math.min(baseHeight - cropY, Math.round(crop.height * baseHeight)),
    );
    const outputSize = boundedDimensions(
      cropWidth,
      cropHeight,
      options.maxOutputDimension ?? EDITOR_OUTPUT_MAX_DIMENSION,
    );
    output = createCanvas(outputSize.width, outputSize.height);
    const outputContext = output.getContext("2d", { alpha: preserveAlpha });
    if (!outputContext) throw new Error("Canvas tidak tersedia di browser ini.");
    if (!preserveAlpha) {
      outputContext.fillStyle = matte;
      outputContext.fillRect(0, 0, output.width, output.height);
    }
    outputContext.imageSmoothingEnabled = true;
    outputContext.imageSmoothingQuality = "high";
    outputContext.drawImage(
      transformed,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      output.width,
      output.height,
    );
    await applyPhotoAdjustments(output, recipe, signal);
    throwIfAborted(signal);

    const blob = await canvasToBlob(
      output,
      outputMime,
      options.quality ?? 0.92,
    );
    throwIfAborted(signal);
    const mime =
      blob.type === "image/png"
        ? "image/png"
        : blob.type === "image/webp"
          ? "image/webp"
          : "image/jpeg";
    return {
      file: new File([blob], editedFileName(sourceFile.name, mime), {
        type: mime,
        lastModified: Date.now(),
      }),
      width: output.width,
      height: output.height,
    };
  } finally {
    releaseCanvas(source);
    if (transformed) releaseCanvas(transformed);
    if (output) releaseCanvas(output);
  }
}
