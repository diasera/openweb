"use client";

import type { ComponentType, SVGProps } from "react";
import {
  Aperture,
  Contrast,
  Crop,
  FlipHorizontal2,
  FlipVertical2,
  Lock,
  LockOpen,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Sun,
  ThermometerSun,
} from "lucide-react";
import { buildPhotoFilter } from "@/lib/media-editor";
import type {
  PhotoAdjustments,
  PhotoAspectId,
  PhotoEditRecipe,
  PhotoEditorProfile,
  PhotoFilterId,
} from "@/lib/media-editor";
import { cn } from "@/lib/utils/cn";

export type PhotoEditorTool = "crop" | "adjust" | "filter";
type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const ADJUSTMENTS: ReadonlyArray<{
  key: keyof PhotoAdjustments;
  label: string;
  icon: Icon;
  min?: number;
}> = [
  { key: "exposure", label: "Eksposur", icon: Aperture },
  { key: "brightness", label: "Kecerahan", icon: Sun },
  { key: "contrast", label: "Kontras", icon: Contrast },
  { key: "highlights", label: "Sorotan", icon: Sun },
  { key: "shadows", label: "Bayangan", icon: Contrast },
  { key: "saturation", label: "Saturasi", icon: Sparkles },
  { key: "warmth", label: "Kehangatan", icon: ThermometerSun },
  { key: "vignette", label: "Vinyet", icon: Aperture, min: 0 },
];

const FILTERS: ReadonlyArray<{ id: PhotoFilterId; label: string }> = [
  { id: "none", label: "Asli" },
  { id: "vivid", label: "Cerah" },
  { id: "dramatic", label: "Dramatis" },
  { id: "warm", label: "Hangat" },
  { id: "cool", label: "Sejuk" },
  { id: "mono", label: "Mono" },
  { id: "noir", label: "Noir" },
];

function RangeControl({
  label,
  value,
  icon: Icon,
  min = -100,
  max = 100,
  step = 1,
  suffix = "",
  onChange,
  onGestureStart,
  onGestureEnd,
}: {
  label: string;
  value: number;
  icon: Icon;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 flex items-center gap-2 text-xs font-medium text-white/65">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="flex-1">{label}</span>
        <output className="min-w-11 text-right tabular-nums text-white">
          {Math.round(value * 10) / 10}
          {suffix}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onPointerDown={onGestureStart}
        onPointerUp={onGestureEnd}
        onPointerCancel={onGestureEnd}
        onKeyDown={onGestureStart}
        onKeyUp={onGestureEnd}
        onBlur={onGestureEnd}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className="h-11 w-full cursor-pointer accent-white"
      />
    </label>
  );
}

function RoundTool({
  label,
  active = false,
  icon: Icon,
  onClick,
}: {
  label: string;
  active?: boolean;
  icon: Icon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={onClick}
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-full transition active:scale-95",
        active ? "bg-white text-black" : "bg-white/10 text-white",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

function ToolTabs({
  active,
  onChange,
}: {
  active: PhotoEditorTool;
  onChange: (tool: PhotoEditorTool) => void;
}) {
  const tools: ReadonlyArray<{ id: PhotoEditorTool; label: string; icon: Icon }> = [
    { id: "crop", label: "Pangkas", icon: Crop },
    { id: "adjust", label: "Sesuaikan", icon: SlidersHorizontal },
    { id: "filter", label: "Filter", icon: Sparkles },
  ];
  return (
    <div
      className="grid grid-cols-3 border-t border-white/10"
      role="tablist"
      aria-label="Alat edit foto"
    >
      {tools.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          onClick={() => onChange(id)}
          className={cn(
            "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] transition active:scale-[.97]",
            active === id ? "text-white" : "text-white/45 hover:text-white/75",
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          {label}
          {active === id && (
            <span className="absolute bottom-0 h-0.5 w-5 rounded-full bg-white" />
          )}
        </button>
      ))}
    </div>
  );
}

export function PhotoEditorControls({
  activeTool,
  profile,
  aspect,
  previewUrl,
  recipe,
  onActiveToolChange,
  onAspectChange,
  onRotate,
  onDiscreteRecipe,
  onContinuousRecipe,
  onGestureStart,
  onGestureEnd,
}: {
  activeTool: PhotoEditorTool;
  profile: PhotoEditorProfile;
  aspect: PhotoAspectId;
  previewUrl: string;
  recipe: PhotoEditRecipe;
  onActiveToolChange: (tool: PhotoEditorTool) => void;
  onAspectChange: (aspect: PhotoAspectId) => void;
  onRotate: () => void;
  onDiscreteRecipe: (
    update: (current: PhotoEditRecipe) => PhotoEditRecipe,
  ) => void;
  onContinuousRecipe: (
    update: (current: PhotoEditRecipe) => PhotoEditRecipe,
  ) => void;
  onGestureStart: () => void;
  onGestureEnd: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="max-h-[29dvh] min-h-28 overflow-y-auto px-4 py-3 [overscroll-behavior:contain]">
        {activeTool === "crop" && (
          <div className="space-y-3">
            <p className="text-center text-[11px] leading-relaxed text-white/45">
              Seret tepi atau sudut untuk memangkas; seret bagian tengah untuk
              memindahkan area.
            </p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <RoundTool label="Putar 90 derajat" icon={RotateCw} onClick={onRotate} />
              <RoundTool
                label="Balik horizontal"
                icon={FlipHorizontal2}
                active={recipe.flipHorizontal}
                onClick={() =>
                  onDiscreteRecipe((current) => ({
                    ...current,
                    flipHorizontal: !current.flipHorizontal,
                  }))
                }
              />
              <RoundTool
                label="Balik vertikal"
                icon={FlipVertical2}
                active={recipe.flipVertical}
                onClick={() =>
                  onDiscreteRecipe((current) => ({
                    ...current,
                    flipVertical: !current.flipVertical,
                  }))
                }
              />
              <span className="mx-1 h-7 w-px shrink-0 bg-white/10" />
              <div className="flex gap-1 rounded-full bg-white/10 p-1">
                {profile.aspects.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={aspect === item.id}
                    onClick={() => onAspectChange(item.id)}
                    className={cn(
                      "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition",
                      aspect === item.id
                        ? "bg-white text-black"
                        : "text-white/70 hover:text-white",
                    )}
                  >
                    {item.ratio === null ? (
                      <LockOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <RangeControl
              label="Luruskan"
              value={recipe.straighten}
              min={-45}
              max={45}
              step={0.1}
              suffix="°"
              icon={RotateCw}
              onChange={(straighten) =>
                onContinuousRecipe((current) => ({ ...current, straighten }))
              }
              onGestureStart={onGestureStart}
              onGestureEnd={onGestureEnd}
            />
          </div>
        )}

        {activeTool === "adjust" && (
          <div className="grid gap-x-5 gap-y-2 sm:grid-cols-2">
            {ADJUSTMENTS.map(({ key, label, icon, min }) => (
              <RangeControl
                key={key}
                label={label}
                value={recipe.adjustments[key]}
                min={min}
                icon={icon}
                onChange={(value) =>
                  onContinuousRecipe((current) => ({
                    ...current,
                    adjustments: { ...current.adjustments, [key]: value },
                  }))
                }
                onGestureStart={onGestureStart}
                onGestureEnd={onGestureEnd}
              />
            ))}
          </div>
        )}

        {activeTool === "filter" && (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {FILTERS.map((item) => {
              const filterRecipe = { ...recipe, filter: item.id };
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={recipe.filter === item.id}
                  onClick={() =>
                    onDiscreteRecipe((current) => ({
                      ...current,
                      filter: item.id,
                    }))
                  }
                  className="w-20 shrink-0 text-center text-xs text-white"
                >
                  <span
                    className={cn(
                      "mx-auto mb-1.5 block h-16 w-16 rounded-xl border-2 bg-cover bg-center transition",
                      recipe.filter === item.id
                        ? "scale-[1.03] border-white"
                        : "border-transparent",
                    )}
                    style={{
                      backgroundImage: `url(${JSON.stringify(previewUrl)})`,
                      filter: buildPhotoFilter(filterRecipe),
                    }}
                    aria-hidden="true"
                  />
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <ToolTabs active={activeTool} onChange={onActiveToolChange} />
    </div>
  );
}
