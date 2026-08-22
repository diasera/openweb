"use client";

import { Search } from "lucide-react";
import { ImageField } from "@/components/admin/image-field";
import { SITE_CONFIG_LIMITS } from "@/lib/site-config/client";
import { getSiteOrigin } from "@/lib/site-config/client";
import type { SiteSettingsRow } from "@/lib/types/database";
import { saveSeoSettings } from "@/app/profil/(admin)/setting/actions";
import { TextField } from "./form-fields";
import { SettingsBooleanField } from "./settings-boolean-field";
import { SettingsSection } from "./settings-section";
import { SettingsTabForm } from "./settings-tab-form";
import { useSettingsSectionForm } from "./use-settings-section-form";

/**
 * Tab SEO: canonical URL, gambar sosial default, indexing, dan verifikasi
 * mesin pencari. Judul & deskripsi Google diatur dari tab Identitas.
 */
export function SeoSection({
  settings,
  onDirtyChange,
}: {
  settings: SiteSettingsRow;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { formRef, dirty, handleSubmit, pending, fieldErrors } =
    useSettingsSectionForm("seo", saveSeoSettings, "Pengaturan SEO tersimpan", {
      onDirtyChange,
    });
  const siteUrl = getSiteOrigin(settings);

  return (
    <SettingsTabForm
      formRef={formRef}
      dirty={dirty}
      onSubmit={handleSubmit}
      pending={pending}
    >
      <SettingsSection
        title="SEO dan mesin pencari"
        description="Canonical URL, gambar sosial default, indexing, dan verifikasi Search Console dari satu tempat."
        icon={<Search className="h-5 w-5" />}
      >
        <TextField
          label="URL utama (canonical)"
          id="site_url"
          name="site_url"
          type="url"
          defaultValue={siteUrl}
          required
          error={fieldErrors.site_url}
          hint="Gunakan origin HTTPS tanpa path, misalnya https://contoh.org."
        />
        <ImageField
          name="seo_image"
          label="Gambar sosial default"
          initialUrl={settings.seo_image_url}
          profile="site-seo"
          wide
          removable
          hint="Editor memakai rasio sosial 1200 × 630 untuk Open Graph dan kartu sosial. Tanpa gambar, kartu sosial otomatis dirender dari judul halaman."
        />

        <div className="border-border space-y-4 border-t pt-5">
          <SettingsBooleanField
            name="seo_indexing_enabled"
            title="Izinkan mesin pencari mengindeks website"
            description="Matikan saat website masih disiapkan. Setelah aktif, sitemap dan canonical tetap perlu dirayapi ulang."
            defaultChecked={settings.seo_indexing_enabled}
          />
          <div>
            <p className="mb-4 text-sm font-semibold">Verifikasi kepemilikan</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Google Search Console"
                id="google_site_verification"
                name="google_site_verification"
                defaultValue={settings.google_site_verification ?? ""}
                maxLength={SITE_CONFIG_LIMITS.verification}
                error={fieldErrors.google_site_verification}
                hint="Isi nilai content, bukan seluruh tag meta."
              />
              <TextField
                label="Bing Webmaster"
                id="bing_site_verification"
                name="bing_site_verification"
                defaultValue={settings.bing_site_verification ?? ""}
                maxLength={SITE_CONFIG_LIMITS.verification}
                error={fieldErrors.bing_site_verification}
                hint="Isi nilai msvalidate.01 bila digunakan."
              />
            </div>
          </div>
        </div>

        <div className="bg-surface-2 rounded-2xl p-4 text-sm">
          <p className="font-semibold">Endpoint teknis otomatis</p>
          <div className="text-muted mt-2 space-y-1 break-all text-xs">
            <p>{siteUrl}/sitemap.xml</p>
            <p>{siteUrl}/robots.txt</p>
            <p>{siteUrl}/api/og</p>
          </div>
          <p className="text-muted mt-2 text-xs leading-relaxed">
            Sitemap, robots, dan kartu sosial dinamis diperbarui otomatis dari
            pengaturan ini; Google tetap menentukan peringkat dari kualitas konten.
          </p>
        </div>
      </SettingsSection>
    </SettingsTabForm>
  );
}
