"use client";

import { Contact } from "lucide-react";
import {
  SITE_CONFIG_LIMITS,
  SOCIAL_NETWORKS,
} from "@/lib/site-config/client";
import { getSiteOrigin } from "@/lib/site-config/client";
import type { SiteSettingsRow } from "@/lib/types/database";
import { saveContactSettings } from "@/app/profil/(admin)/setting/actions";
import { TextField, TextAreaField } from "./form-fields";
import { SettingsBooleanField } from "./settings-boolean-field";
import { SettingsSection } from "./settings-section";
import { SettingsTabForm } from "./settings-tab-form";
import { useSettingsSectionForm } from "./use-settings-section-form";

/** Tab Kontak & Integrasi: kontak publik, sosial, analitik, dan iklan. */
export function ContactSection({
  settings,
  onDirtyChange,
}: {
  settings: SiteSettingsRow;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { formRef, dirty, handleSubmit, pending, fieldErrors } =
    useSettingsSectionForm(
      "contact",
      saveContactSettings,
      "Kontak dan integrasi tersimpan",
      { onDirtyChange },
    );
  const siteUrl = getSiteOrigin(settings);

  return (
    <SettingsTabForm
      formRef={formRef}
      dirty={dirty}
      onSubmit={handleSubmit}
      pending={pending}
    >
      <SettingsSection
        title="Kontak dan integrasi"
        description="Informasi publik untuk halaman Tentang serta structured data organisasi, plus analitik dan iklan."
        icon={<Contact className="h-5 w-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Email publik"
            id="contact_email"
            name="contact_email"
            type="email"
            defaultValue={settings.contact_email ?? ""}
            error={fieldErrors.contact_email}
          />
          <TextField
            label="Telepon publik"
            id="contact_phone"
            name="contact_phone"
            type="tel"
            defaultValue={settings.contact_phone ?? ""}
            maxLength={SITE_CONFIG_LIMITS.contactPhone}
            error={fieldErrors.contact_phone}
          />
        </div>
        <TextAreaField
          label="Alamat"
          id="contact_address"
          name="contact_address"
          rows={3}
          maxLength={SITE_CONFIG_LIMITS.contactAddress}
          defaultValue={settings.contact_address ?? ""}
          error={fieldErrors.contact_address}
        />

        <div className="border-border border-t pt-5">
          <p className="mb-4 text-sm font-semibold">Tautan sosial</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {SOCIAL_NETWORKS.map((network) => (
              <TextField
                key={network.key}
                label={network.label}
                id={`social_${network.key}`}
                name={`social_${network.key}`}
                type="url"
                defaultValue={settings.social?.[network.key] ?? ""}
                placeholder={network.placeholder}
                maxLength={SITE_CONFIG_LIMITS.socialUrl}
                error={fieldErrors[`social_${network.key}`]}
              />
            ))}
          </div>
        </div>

        <div className="border-border space-y-4 border-t pt-5">
          <TextField
            label="Google Analytics ID"
            id="google_analytics_id"
            name="google_analytics_id"
            defaultValue={settings.google_analytics_id ?? ""}
            maxLength={SITE_CONFIG_LIMITS.analyticsId}
            error={fieldErrors.google_analytics_id}
            hint="Format G-XXXXXXXXXX atau GT-XXXXXXXXXX."
          />
          <TextField
            label="Google AdSense client ID"
            id="google_adsense_client_id"
            name="google_adsense_client_id"
            defaultValue={settings.google_adsense_client_id ?? ""}
            maxLength={SITE_CONFIG_LIMITS.adsenseClientId}
            error={fieldErrors.google_adsense_client_id}
            placeholder="ca-pub-0000000000000000"
            hint="Format ca-pub- diikuti 16 angka."
          />
          <SettingsBooleanField
            name="google_adsense_auto_ads"
            title="Muat kode Auto Ads"
            description="Aktifkan hanya setelah website disetujui di AdSense; iklan dapat memengaruhi performa dan pengalaman pengguna."
            defaultChecked={settings.google_adsense_auto_ads}
          />
          <div className="bg-surface-2 rounded-2xl p-4 text-sm">
            <p className="font-semibold">ads.txt otomatis</p>
            <p className="text-muted mt-1 break-all text-xs">{siteUrl}/ads.txt</p>
            <p className="text-muted mt-2 text-xs leading-relaxed">
              Publisher ID diambil dari client ID sehingga tidak perlu diisi dua kali.
            </p>
          </div>
        </div>
      </SettingsSection>
    </SettingsTabForm>
  );
}
