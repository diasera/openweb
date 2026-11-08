"use client";

import { useState, type CSSProperties } from "react";
import { Building2, Palette, Tags } from "lucide-react";
import {
  getContentLabels,
  LOCALE_OPTIONS,
  SITE_CONFIG_LIMITS,
  SITE_TYPE_OPTIONS,
} from "@/lib/site-config/client";
import { getHomeSeoDescription, getHomeSeoTitle } from "@/lib/seo";
import { hexToRgbChannels, rgbChannelsToHex, themePrimaryHex } from "@/lib/theme";
import type { SiteSettingsRow } from "@/lib/types/database";
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
  "#f97316",
  "#eab308",
  "#16a34a",
  "#0d9488",
  "#0284c7",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#1f2937",
] as const;

/** Kartu contoh tema: gradien, tombol, chip, dan cincin dengan warna draf. */
function ThemePreview({ primary, accent }: { primary: string; accent: string }) {
  const style = {
    "--primary": hexToRgbChannels(primary) ?? undefined,
    "--accent": hexToRgbChannels(accent) ?? undefined,
  } as CSSProperties;
  return (
    <div style={style} className="border-border overflow-hidden rounded-2xl border" aria-hidden="true">
      <div className="liquid-gradient grain relative h-20">
        <span className="absolute bottom-3 left-3 rounded-full border border-white/30 bg-white/15 px-2.5 py-0.5 text-caption2 font-semibold uppercase tracking-wide text-white backdrop-blur">
          Pratinjau tema
        </span>
      </div>
      <div className="bg-surface flex flex-wrap items-center gap-2.5 p-3">
        <span className="gloss rounded-full px-3.5 py-1.5 text-footnote font-semibold text-white" style={{ backgroundColor: primary }}>
          Tombol utama
        </span>
        <span
          className="rounded-full px-3 py-1 text-caption1 font-semibold"
          style={{ backgroundColor: `color-mix(in oklab, ${primary} 12%, transparent)`, color: primary }}
        >
          Lihat semua →
        </span>
        <span className="avatar-ring size-8 rounded-full p-[2px]">
          <span className="bg-surface block size-full rounded-full" />
        </span>
      </div>
    </div>
  );
}

/**
 * Tab Identitas: satu sumber nama & deskripsi yang langsung dipakai Google
 * (pratinjau hasil pencarian live), logo, warna merek dengan pratinjau tema,
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
  const primaryHex = themePrimaryHex(settings.theme);
  const [colors, setColors] = useState({
    primary: primaryHex,
    accent: settings.theme?.accent ? rgbChannelsToHex(settings.theme.accent) : primaryHex,
  });
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
        title="Logo & warna"
        description="Warna utama dipakai tombol dan aksen; warna aksen mewarnai gradien hero, cincin anggota inti, dan cahaya latar."
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
        <FieldGroup title="Warna merek">
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              label="Warna utama"
              id="primary_hex"
              name="primary_hex"
              defaultValue={colors.primary}
              presets={COLOR_PRESETS}
              error={fieldErrors.primary_hex}
              onValueChange={(primary) => setColors((value) => ({ ...value, primary }))}
            />
            <ColorField
              label="Warna aksen"
              id="accent_hex"
              name="accent_hex"
              defaultValue={colors.accent}
              presets={COLOR_PRESETS}
              error={fieldErrors.accent_hex}
              onValueChange={(accent) => setColors((value) => ({ ...value, accent }))}
            />
          </div>
          <ThemePreview primary={colors.primary} accent={colors.accent} />
          <p className="text-muted text-caption1 leading-relaxed">
            Warna teks otomatis digelapkan/diterangkan secukupnya agar tetap lolos kontras
            AA di tema terang maupun gelap.
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
