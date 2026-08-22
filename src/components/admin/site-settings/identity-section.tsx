"use client";

import { Building2 } from "lucide-react";
import { useState } from "react";
import { ImageField } from "@/components/admin/image-field";
import {
  getContentLabels,
  LOCALE_OPTIONS,
  SITE_CONFIG_LIMITS,
  SITE_TYPE_OPTIONS,
} from "@/lib/site-config/client";
import { getHomeSeoDescription, getHomeSeoTitle } from "@/lib/seo";
import { getSiteOrigin } from "@/lib/site-config/client";
import { rgbChannelsToHex } from "@/lib/theme";
import type { SiteSettingsRow } from "@/lib/types/database";
import { saveIdentitySettings } from "@/app/profil/(admin)/setting/actions";
import { ColorField, SelectField, TextField, TextAreaField } from "./form-fields";
import { SerpPreview } from "./serp-preview";
import { SettingsSection } from "./settings-section";
import { SettingsTabForm } from "./settings-tab-form";
import { useSettingsSectionForm } from "./use-settings-section-form";

const DEFAULT_PRIMARY_HEX = "#e60023";

/**
 * Tab Identitas: satu sumber nama & deskripsi yang langsung dipakai Google
 * (pratinjau SERP live menggantikan field judul/deskripsi SEO terpisah).
 */
export function IdentitySection({
  settings,
  onDirtyChange,
}: {
  settings: SiteSettingsRow;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { formRef, dirty, handleSubmit, pending, fieldErrors } =
    useSettingsSectionForm(
      "identity",
      saveIdentitySettings,
      "Identitas website tersimpan",
      { onDirtyChange },
    );
  const labels = getContentLabels(settings);
  const siteUrl = getSiteOrigin(settings);
  const [preview, setPreview] = useState({
    siteName: settings.site_name,
    tagline: settings.tagline ?? "",
    description: settings.description ?? "",
  });
  const previewSettings: SiteSettingsRow = {
    ...settings,
    site_name: preview.siteName,
    tagline: preview.tagline,
    description: preview.description,
  };
  const primary = settings.theme?.primary
    ? rgbChannelsToHex(settings.theme.primary)
    : DEFAULT_PRIMARY_HEX;
  const accent = settings.theme?.accent
    ? rgbChannelsToHex(settings.theme.accent)
    : primary;

  return (
    <SettingsTabForm
      formRef={formRef}
      dirty={dirty}
      onSubmit={handleSubmit}
      pending={pending}
    >
      <SettingsSection
        title="Identitas website"
        description="Satu sumber identitas untuk judul, navigasi, hasil pencarian, dan aplikasi web."
        icon={<Building2 className="h-5 w-5" />}
      >
        <SerpPreview
          siteName={preview.siteName || "…"}
          siteUrl={siteUrl}
          title={getHomeSeoTitle(previewSettings)}
          description={getHomeSeoDescription(previewSettings)}
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
            hint="Nama singkat yang konsisten di seluruh website."
            onChange={(event) =>
              setPreview((value) => ({ ...value, siteName: event.target.value }))
            }
          />
          <TextField
            label="Nama alternatif"
            id="site_alternate_name"
            name="site_alternate_name"
            defaultValue={settings.site_alternate_name ?? ""}
            maxLength={SITE_CONFIG_LIMITS.siteAlternateName}
            error={fieldErrors.site_alternate_name}
            hint="Nama lengkap atau singkatan lain yang dikenal publik."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="site_type"
            name="site_type"
            label="Jenis website"
            defaultValue={settings.site_type}
            options={SITE_TYPE_OPTIONS}
          />
          <SelectField
            id="locale"
            name="locale"
            label="Bahasa"
            defaultValue={settings.locale}
            options={LOCALE_OPTIONS}
          />
        </div>
        <TextField
          label="Tagline"
          id="tagline"
          name="tagline"
          defaultValue={settings.tagline ?? ""}
          maxLength={SITE_CONFIG_LIMITS.tagline}
          error={fieldErrors.tagline}
          hint="Dipakai sebagai pelengkap judul halaman depan di hasil pencarian."
          onChange={(event) =>
            setPreview((value) => ({ ...value, tagline: event.target.value }))
          }
        />
        <TextAreaField
          label="Deskripsi website"
          id="description"
          name="description"
          rows={3}
          maxLength={SITE_CONFIG_LIMITS.description}
          defaultValue={settings.description ?? ""}
          error={fieldErrors.description}
          hint="Ringkasan identitas yang menjadi cuplikan hasil pencarian halaman depan."
          onChange={(event) =>
            setPreview((value) => ({ ...value, description: event.target.value }))
          }
        />

        <div className="border-border border-t pt-5">
          <p className="mb-4 text-sm font-semibold">Logo dan warna</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <ImageField
              name="logo"
              label="Logo utama"
              initialUrl={settings.logo_url}
              profile="site-logo"
              removable
              hint="Gunakan gambar persegi transparan bila tersedia."
            />
            <ImageField
              name="favicon"
              label="Favicon"
              initialUrl={settings.favicon_url}
              profile="site-favicon"
              removable
              hint="Disarankan gambar persegi minimal 48 × 48 px."
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ColorField
              label="Warna utama"
              id="primary_hex"
              name="primary_hex"
              defaultValue={primary}
              error={fieldErrors.primary_hex}
            />
            <ColorField
              label="Warna aksen"
              id="accent_hex"
              name="accent_hex"
              defaultValue={accent}
              error={fieldErrors.accent_hex}
            />
          </div>
        </div>

        <div className="border-border border-t pt-5">
          <p className="mb-4 text-sm font-semibold">Sebutan konten</p>
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
        </div>
      </SettingsSection>
    </SettingsTabForm>
  );
}
