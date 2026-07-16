import type {
  PhotoAdjustments,
  PhotoEditRecipe,
  PhotoFilterId,
} from "./types";
import { clampNumber } from "./math";

/** Satu profil preset untuk thumbnail CSS dan renderer pixel final. */
const PHOTO_FILTER_PROFILES: Readonly<
  Record<PhotoFilterId, Partial<PhotoAdjustments>>
> = Object.freeze({
  none: {},
  vivid: { contrast: 10, saturation: 24 },
  dramatic: { contrast: 24, highlights: -12, shadows: -8, saturation: -8 },
  mono: { contrast: 10, saturation: -100 },
  noir: { exposure: -7, contrast: 30, saturation: -100 },
  warm: { saturation: 10, warmth: 24 },
  cool: { saturation: -4, warmth: -24 },
});

export function resolvedPhotoAdjustments(
  recipe: PhotoEditRecipe,
): PhotoAdjustments {
  const preset = PHOTO_FILTER_PROFILES[recipe.filter];
  const values = { ...recipe.adjustments };
  for (const key of Object.keys(values) as (keyof PhotoAdjustments)[]) {
    values[key] = clampNumber(values[key] + (preset[key] ?? 0), -100, 100);
  }
  values.vignette = clampNumber(values.vignette, 0, 100);
  return values;
}
