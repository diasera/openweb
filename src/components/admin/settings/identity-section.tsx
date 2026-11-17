"use client";

import { useState, type CSSProperties } from "react";
import { Building2, Check, Moon, Palette, Sparkles, Sun, Tags } from "lucide-react";
import {
  getContentLabels,
  LOCALE_OPTIONS,
  SITE_CONFIG_LIMITS,
  SITE_TYPE_OPTIONS,
} from "@/lib/site-config/client";
import { getHomeSeoDescription, getHomeSeoTitle } from "@/lib/seo";
import {
  evaluateBrandContrast,
  getThemePreset,
  hexToRgbChannels,
  resolveThemePreset,
  rgbChannelsToHex,
  THEME_PRESETS,
  themePrimaryHex,
  type ThemePresetId,
} from "@/lib/theme";
import { notifyFormChange } from "@/lib/hooks/use-form-dirty";
import type { SiteSettingsRow } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { saveIdentitySettings } from "@/app/profil/(admin)/setting/actions";
import {
  ColorField,
  FieldGroup,
  FormSection,
  SelectField,
  TextAreaField,
  TextField,
} from "../form-controls";
import { ImageField } from "../image-field";
import { SerpPreview } from "../serp-preview";
import { SettingsTabForm } from "./settings-tab-form";
import { useSettingsSectionForm } from "./use-settings-section-form";

/** Palet cepat warna merek; tetap bisa diketik/dipilih bebas. */
const COLOR_PRESETS = [
  "#e60023",
  "#9a4e24",
  "#ea580c",
  "#ca8a04",
  "#0f766e",
  "#16a34a",
  "#0284c7",
  "#4f46e5",
  "#db2777",
  "#1f2937",
] as const;

function rgbCss(tuple: readonly [number, number, number]): string {
  return `rgb(${tuple[0]} ${tuple[1]} ${tuple[2]})`;
}

/**
 * Kartu pratinjau tema dual-mode (Terang & Gelap berdampingan) lengkap dengan
 * simulasi permukaan preset, radius kartu, gradien OKLCH, dan skor kontras AA/APCA.
 */
function ThemePreview({
  presetId,
  primary,
  accent,
}: {
  presetId: ThemePresetId;
  primary: string;
  accent: string;
}) {
  const preset = getThemePreset(presetId);
  const contrast = evaluateBrandContrast(primary, presetId);
  const style = {
    "--primary": hexToRgbChannels(primary) ?? undefined,
    "--accent": hexToRgbChannels(accent) ?? undefined,
    "--primary-oklch": primary,
    "--accent-oklch": accent,
    "--grain-opacity": preset.grainOpacity,
  } as CSSProperties;

  const modes = [
    {
      id: "light",
      label: "Mode Terang",
      icon: Sun,
      tokens: preset.light,
      readable: contrast.lightReadableHex,
      ratio: contrast.lightRatio,
      apca: contrast.lightApca,
    },
    {
      id: "dark",
      label: "Mode Gelap",
      icon: Moon,
      tokens: preset.dark,
      readable: contrast.darkReadableHex,
      ratio: contrast.darkRatio,
      apca: contrast.darkApca,
    },
  ] as const;

  return (
    <div style={style} className="space-y-2.5" aria-hidden="true">
      <div
        className="border-border overflow-hidden border"
        style={{ borderRadius: preset.radius.iosLg }}
      >
        <div className="liquid-gradient grain relative h-20">
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-2.5 py-0.5 text-caption2 font-semibold uppercase tracking-wide text-white backdrop-blur">
            <Sparkles className="size-3" />
            {preset.label}
          </span>
        </div>

        <div className="grid sm:grid-cols-2">
          {modes.map((mode) => {
            const ModeIcon = mode.icon;
            return (
              <div
                key={mode.id}
                className="p-3.5"
                style={{
                  backgroundColor: rgbCss(mode.tokens.bg),
                  color: rgbCss(mode.tokens.foreground),
                }}
              >
                <div className="mb-2 flex items-center justify-between text-caption2 font-semibold">
                  <span className="inline-flex items-center gap-1" style={{ color: rgbCss(mode.tokens.muted) }}>
                    <ModeIcon className="size-3.5" />
                    {mode.label}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 font-mono"
                    style={{
                      backgroundColor: rgbCss(mode.tokens.surface2),
                      color: rgbCss(mode.tokens.muted),
                    }}
                  >
                    {mode.ratio}:1 · Lc {mode.apca}
                  </span>
                </div>

                <div
                  className="flex flex-wrap items-center gap-2 border p-3"
                  style={{
                    backgroundColor: rgbCss(mode.tokens.surface),
                    borderColor: rgbCss(mode.tokens.border),
                    borderRadius: preset.radius.card,
                    boxShadow: mode.tokens.elevationSoft,
                  }}
                >
                  <span
                    className="gloss rounded-full px-3 py-1 text-caption1 font-semibold text-white"
                    style={{ backgroundColor: primary }}
                  >
                    Aksi utama
                  </span>
                  <span
                    className="rounded-full px-2.5 py-1 text-caption1 font-semibold"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${primary} 12%, ${rgbCss(mode.tokens.surface)})`,
                      color: mode.readable,
                    }}
                  >
                    Lihat semua →
                  </span>
                  <span className="avatar-ring ml-auto size-7 rounded-full p-[2px]">
                    <span
                      className="block size-full rounded-full"
                      style={{ backgroundColor: rgbCss(mode.tokens.surface) }}
                    />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Tab Identitas: satu sumber nama & deskripsi yang langsung dipakai Google
 * (pratinjau hasil pencarian live), logo, 5 preset atmosfer + warna merek OKLCH,
 * dan sebutan konten.
 */
export function IdentitySection({
  settings,
  siteUrl,
  onDirtyChange,
}: {
  settings: SiteSettingsRow;
  siteUrl: string;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { formRef, dirty, handleSubmit, pending, fieldErrors } = useSettingsSectionForm(
    "identity",
    saveIdentitySettings,
    "Identitas website tersimpan",
    onDirtyChange,
  );
  const labels = getContentLabels(settings);
  const [preview, setPreview] = useState({
    siteName: settings.site_name,
    tagline: settings.tagline ?? "",
    description: settings.description ?? "",
  });
  const initialPreset = resolveThemePreset(settings.theme);
  const primaryHex = themePrimaryHex(settings.theme);
  const [presetId, setPresetId] = useState<ThemePresetId>(initialPreset);
  const [colors, setColors] = useState({
    primary: primaryHex.toLowerCase(),
    accent: (settings.theme?.accent ? rgbChannelsToHex(settings.theme.accent) : primaryHex).toLowerCase(),
  });
  const activePreset = getThemePreset(presetId);
  const matchesRecommendedPalette =
    colors.primary.toLowerCase() === activePreset.recommendedPrimary.toLowerCase() &&
    colors.accent.toLowerCase() === activePreset.recommendedAccent.toLowerCase();

  const previewSettings: SiteSettingsRow = {
    ...settings,
    site_name: preview.siteName,
    tagline: preview.tagline,
    description: preview.description,
  };
  const description = getHomeSeoDescription(previewSettings);

  return (
    <SettingsTabForm formRef={formRef} dirty={dirty} onSubmit={handleSubmit} pending={pending}>
      <FormSection
        id="identitas"
        title="Identitas & mesin pencari"
        description="Nama, tagline, dan deskripsi ini menyusun judul serta cuplikan halaman depan di Google."
        icon={<Building2 className="size-5" />}
      >
        <SerpPreview
          siteName={preview.siteName}
          logoUrl={settings.logo_url}
          url={`${siteUrl}/`}
          title={getHomeSeoTitle(previewSettings)}
          description={description}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Nama website"
            id="site_name"
            name="site_name"
            defaultValue={settings.site_name}
            required
            maxLength={SITE_CONFIG_LIMITS.siteName}
            error={fieldErrors.site_name}
            hint="Tampil di bilah atas, judul tab, aplikasi terpasang, dan Google."
            onChange={(event) => setPreview((value) => ({ ...value, siteName: event.target.value }))}
          />
          <TextField
            label="Nama alternatif"
            id="site_alternate_name"
            name="site_alternate_name"
            defaultValue={settings.site_alternate_name ?? ""}
            maxLength={SITE_CONFIG_LIMITS.siteAlternateName}
            error={fieldErrors.site_alternate_name}
            hint="Nama lengkap/singkatan lain khusus mesin pencari. Tidak tampil di halaman."
          />
        </div>
        <TextField
          label="Tagline"
          id="tagline"
          name="tagline"
          defaultValue={settings.tagline ?? ""}
          maxLength={SITE_CONFIG_LIMITS.tagline}
          error={fieldErrors.tagline}
          hint="Pelengkap judul halaman depan di Google: “Nama — Tagline”."
          onChange={(event) => setPreview((value) => ({ ...value, tagline: event.target.value }))}
        />
        <TextAreaField
          label="Deskripsi website"
          id="description"
          name="description"
          rows={3}
          maxLength={SITE_CONFIG_LIMITS.description}
          defaultValue={settings.description ?? ""}
          error={fieldErrors.description}
          hint={`${preview.description.length} karakter · ideal 70–160 untuk cuplikan Google.`}
          onChange={(event) => setPreview((value) => ({ ...value, description: event.target.value }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="site_type"
            name="site_type"
            label="Jenis website"
            defaultValue={settings.site_type}
            options={SITE_TYPE_OPTIONS}
            hint="Menentukan jenis organisasi di structured data Google."
          />
          <SelectField
            id="locale"
            name="locale"
            label="Bahasa"
            defaultValue={settings.locale}
            options={LOCALE_OPTIONS}
          />
        </div>
      </FormSection>

      <FormSection
        id="merek"
        title="Logo, atmosfer & warna"
        description="Pilih karakter permukaan website, lalu sesuaikan warna utama dan aksen dengan jaminan kontras perseptual OKLCH."
        icon={<Palette className="size-5" />}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <ImageField
            name="logo"
            label="Logo utama"
            initialUrl={settings.logo_url}
            profile="site-logo"
            removable
            hint="Gambar persegi, transparan bila ada."
          />
          <ImageField
            name="favicon"
            label="Favicon"
            initialUrl={settings.favicon_url}
            profile="site-favicon"
            removable
            hint="Ikon tab browser & Google, minimal 48 × 48 px."
          />
        </div>

        <FieldGroup
          title="Gaya & atmosfer tema"
          description="Mengatur rona latar terang/gelap, kelengkungan sudut kartu, garis tepi, dan kedalaman bayangan di seluruh halaman."
        >
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Gaya & atmosfer tema">
            {THEME_PRESETS.map((preset) => {
              const selected = preset.id === presetId;
              return (
                <label
                  key={preset.id}
                  className={cn(
                    "motion-pressable relative flex cursor-pointer flex-col justify-between gap-3 rounded-2xl border p-3.5 transition-colors",
                    selected
                      ? "border-primary/55 bg-primary/6"
                      : "border-border hover:bg-surface-2/55",
                  )}
                >
                  <input
                    type="radio"
                    name="theme_preset"
                    value={preset.id}
                    checked={selected}
                    onChange={() => setPresetId(preset.id)}
                    className="peer sr-only"
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5" aria-hidden="true">
                      <span
                        className="size-5 rounded-full border border-black/10"
                        style={{ backgroundColor: rgbCss(preset.light.bg) }}
                        title="Permukaan terang"
                      />
                      <span
                        className=" -ml-2 size-5 rounded-full border border-white/20"
                        style={{ backgroundColor: rgbCss(preset.dark.bg) }}
                        title="Permukaan gelap"
                      />
                      <span
                        className="-ml-2 size-5 rounded-full border border-white/40"
                        style={{ backgroundColor: preset.recommendedPrimary }}
                        title="Warna khas"
                      />
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption2 font-semibold",
                        selected ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted",
                      )}
                    >
                      {selected && <Check className="size-3" aria-hidden="true" />}
                      {preset.badge}
                    </span>
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold">{preset.label}</p>
                    <p className="text-muted mt-0.5 text-caption1 leading-snug">{preset.description}</p>
                  </div>
                </label>
              );
            })}
          </div>

          {!matchesRecommendedPalette && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed px-3.5 py-2.5 text-xs">
              <span className="text-muted">
                Ingin menyelaraskan warna merek dengan palet bawaan <strong>{activePreset.label}</strong>?
              </span>
              <button
                type="button"
                onClick={() => {
                  setColors({
                    primary: activePreset.recommendedPrimary,
                    accent: activePreset.recommendedAccent,
                  });
                  const input = formRef.current?.querySelector<HTMLElement>('input[name="primary_hex"]');
                  notifyFormChange(input ?? null);
                }}
                className="text-primary-readable motion-pressable font-semibold hover:underline"
              >
                Terapkan warna khas preset →
              </button>
            </div>
          )}
        </FieldGroup>

        <FieldGroup title="Warna merek">
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              label="Warna utama"
              id="primary_hex"
              name="primary_hex"
              value={colors.primary}
              defaultValue={colors.primary}
              presets={COLOR_PRESETS}
              error={fieldErrors.primary_hex}
              onValueChange={(primary) => setColors((value) => ({ ...value, primary }))}
            />
            <ColorField
              label="Warna aksen"
              id="accent_hex"
              name="accent_hex"
              value={colors.accent}
              defaultValue={colors.accent}
              presets={COLOR_PRESETS}
              error={fieldErrors.accent_hex}
              onValueChange={(accent) => setColors((value) => ({ ...value, accent }))}
            />
          </div>
          <ThemePreview presetId={presetId} primary={colors.primary} accent={colors.accent} />
          <p className="text-muted text-caption1 leading-relaxed">
            Mesin warna <strong>OKLCH</strong> secara otomatis menyesuaikan kecerahan teks agar lolos
            standar <strong>WCAG 2.2 AA (≥ 4.5:1)</strong> dan kontras perseptual <strong>APCA</strong> di
            tema terang maupun gelap tanpa menggeser rona warna asli merek Anda.
          </p>
        </FieldGroup>
      </FormSection>

      <FormSection
        id="sebutan"
        title="Sebutan konten"
        description="Istilah yang dipakai di seluruh halaman, mis. siswa, mahasiswa, atau anggota."
        icon={<Tags className="size-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Satu anggota"
            id="member_label_singular"
            name="member_label_singular"
            defaultValue={labels.memberSingular}
            required
            maxLength={SITE_CONFIG_LIMITS.memberLabel}
            error={fieldErrors.member_label_singular}
            hint="Contoh: siswa, mahasiswa, anggota."
          />
          <TextField
            label="Banyak anggota"
            id="member_label_plural"
            name="member_label_plural"
            defaultValue={labels.memberPlural}
            required
            maxLength={SITE_CONFIG_LIMITS.memberLabel}
            error={fieldErrors.member_label_plural}
          />
          <TextField
            label="Nomor identitas"
            id="member_identifier_label"
            name="member_identifier_label"
            defaultValue={labels.memberIdentifier}
            required
            maxLength={SITE_CONFIG_LIMITS.memberLabel}
            error={fieldErrors.member_identifier_label}
            hint="Contoh: NIS, NIM, ID anggota."
          />
          <TextField
            label="Kelompok inti"
            id="member_core_group_label"
            name="member_core_group_label"
            defaultValue={labels.memberCoreGroup}
            required
            maxLength={SITE_CONFIG_LIMITS.memberLabel}
            error={fieldErrors.member_core_group_label}
            hint="Contoh: Pengurus, Tim inti, Guru."
          />
        </div>
      </FormSection>
    </SettingsTabForm>
  );
}
