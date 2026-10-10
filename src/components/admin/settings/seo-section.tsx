"use client";

import { Activity, Search, ShieldCheck } from "lucide-react";
import { SITE_CONFIG_LIMITS } from "@/lib/site-config/client";
import type { SiteSettingsRow } from "@/lib/types/database";
import { saveSeoSettings } from "@/app/profil/(admin)/setting/actions";
import { FieldGroup, FormSection, SwitchField, TextField } from "../form-controls";
import { ImageField } from "../image-field";
import { SeoHealth } from "./seo-health";
import { SettingsTabForm } from "./settings-tab-form";
import { useSettingsSectionForm } from "./use-settings-section-form";

/**
 * Tab SEO: kesehatan SEO + langkah Search Console, canonical URL, indexing,
 * gambar sosial default, dan kode verifikasi. Judul & deskripsi Google
 * diatur dari tab Identitas agar tidak ada dua sumber.
 */
export function SeoSection({
  settings,
  siteUrl,
  onDirtyChange,
}: {
  settings: SiteSettingsRow;
  siteUrl: string;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { formRef, dirty, handleSubmit, pending, fieldErrors } = useSettingsSectionForm(
    "seo",
    saveSeoSettings,
    "Pengaturan SEO tersimpan",
    onDirtyChange,
  );

  return (
    <SettingsTabForm formRef={formRef} dirty={dirty} onSubmit={handleSubmit} pending={pending}>
      <FormSection
        id="kesehatan"
        title="Status di Google"
        description="Dihitung dari pengaturan tersimpan. Perbaiki yang berwarna kuning agar halaman mudah ditemukan."
        icon={<Activity className="size-5" />}
      >
        <SeoHealth settings={settings} siteUrl={siteUrl} />
      </FormSection>

      <FormSection
        id="indexing"
        title="Indexing & URL utama"
        description="Canonical URL harus sama persis dengan domain properti Search Console."
        icon={<Search className="size-5" />}
      >
        <TextField
          label="URL utama (canonical)"
          id="site_url"
          name="site_url"
          type="url"
          inputMode="url"
          defaultValue={siteUrl}
          required
          error={fieldErrors.site_url}
          hint="Origin HTTPS tanpa path atau garis miring akhir, mis. https://contoh.org."
        />
        <SwitchField
          name="seo_indexing_enabled"
          title="Izinkan mesin pencari mengindeks website"
          description="Matikan hanya saat website masih disiapkan. Saat mati, robots.txt memblokir semua halaman dan sitemap kosong."
          defaultChecked={settings.seo_indexing_enabled}
        />
        <ImageField
          name="seo_image"
          label="Gambar sosial default"
          initialUrl={settings.seo_image_url}
          profile="site-seo"
          wide
          removable
          hint="Rasio 1200 × 630 untuk Open Graph (WhatsApp, Facebook, X). Tanpa gambar, kartu dirender otomatis dari judul halaman."
        />
      </FormSection>

      <FormSection
        id="verifikasi"
        title="Verifikasi kepemilikan"
        description="Opsional bila domain sudah diverifikasi lewat DNS."
        icon={<ShieldCheck className="size-5" />}
      >
        <FieldGroup
          title="Kode verifikasi"
          description="Boleh tempel nilai content saja, seluruh tag <meta>, atau rekaman DNS — kode dibersihkan otomatis."
          className="border-t-0 pt-0"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Google Search Console"
              id="google_site_verification"
              name="google_site_verification"
              defaultValue={settings.google_site_verification ?? ""}
              maxLength={SITE_CONFIG_LIMITS.verification}
              error={fieldErrors.google_site_verification}
              spellCheck={false}
              autoComplete="off"
            />
            <TextField
              label="Bing Webmaster"
              id="bing_site_verification"
              name="bing_site_verification"
              defaultValue={settings.bing_site_verification ?? ""}
              maxLength={SITE_CONFIG_LIMITS.verification}
              error={fieldErrors.bing_site_verification}
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </FieldGroup>
      </FormSection>
    </SettingsTabForm>
  );
}
