"use client";

import { AtSign, ChartNoAxesColumn, Contact, ExternalLink } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { SITE_CONFIG_LIMITS, SOCIAL_NETWORKS } from "@/lib/site-config/client";
import type { SiteSettingsRow } from "@/lib/types/database";
import { saveContactSettings } from "@/app/profil/(admin)/setting/actions";
import { FormSection, SwitchField, TextAreaField, TextField } from "../form-controls";
import { SettingsTabForm } from "./settings-tab-form";
import { useSettingsSectionForm } from "./use-settings-section-form";

/** Tab Kontak & Integrasi: kontak publik, tautan sosial, analitik, dan iklan. */
export function ContactSection({
  settings,
  siteUrl,
  onDirtyChange,
}: {
  settings: SiteSettingsRow;
  siteUrl: string;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { formRef, dirty, handleSubmit, pending, fieldErrors } = useSettingsSectionForm(
    "contact",
    saveContactSettings,
    "Kontak dan integrasi tersimpan",
    onDirtyChange,
  );

  return (
    <SettingsTabForm formRef={formRef} dirty={dirty} onSubmit={handleSubmit} pending={pending}>
      <FormSection
        id="kontak"
        title="Kontak publik"
        description="Tampil di halaman Tentang dan structured data organisasi untuk Google."
        icon={<Contact className="size-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Email publik"
            id="contact_email"
            name="contact_email"
            type="email"
            inputMode="email"
            defaultValue={settings.contact_email ?? ""}
            error={fieldErrors.contact_email}
          />
          <TextField
            label="Telepon publik"
            id="contact_phone"
            name="contact_phone"
            type="tel"
            inputMode="tel"
            defaultValue={settings.contact_phone ?? ""}
            maxLength={SITE_CONFIG_LIMITS.contactPhone}
            error={fieldErrors.contact_phone}
          />
        </div>
        <TextAreaField
          label="Alamat"
          id="contact_address"
          name="contact_address"
          rows={2}
          maxLength={SITE_CONFIG_LIMITS.contactAddress}
          defaultValue={settings.contact_address ?? ""}
          error={fieldErrors.contact_address}
        />
      </FormSection>

      <FormSection
        id="sosial"
        title="Tautan sosial"
        description="Juga dipakai Google untuk menghubungkan profil sosial dengan website (sameAs)."
        icon={<AtSign className="size-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_NETWORKS.map((network) => (
            <TextField
              key={network.key}
              label={network.label}
              id={`social_${network.key}`}
              name={`social_${network.key}`}
              type="url"
              inputMode="url"
              defaultValue={settings.social?.[network.key] ?? ""}
              placeholder={network.placeholder}
              maxLength={SITE_CONFIG_LIMITS.socialUrl}
              error={fieldErrors[`social_${network.key}`]}
            />
          ))}
        </div>
      </FormSection>

      <FormSection
        id="integrasi"
        title="Analitik & iklan"
        description="Skrip pihak ketiga dimuat setelah halaman interaktif agar tidak memperlambat tampilan pertama."
        icon={<ChartNoAxesColumn className="size-5" />}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Google Analytics ID"
            id="google_analytics_id"
            name="google_analytics_id"
            defaultValue={settings.google_analytics_id ?? ""}
            maxLength={SITE_CONFIG_LIMITS.analyticsId}
            error={fieldErrors.google_analytics_id}
            placeholder="G-XXXXXXXXXX"
            spellCheck={false}
            autoComplete="off"
          />
          <TextField
            label="Google AdSense client ID"
            id="google_adsense_client_id"
            name="google_adsense_client_id"
            defaultValue={settings.google_adsense_client_id ?? ""}
            maxLength={SITE_CONFIG_LIMITS.adsenseClientId}
            error={fieldErrors.google_adsense_client_id}
            placeholder="ca-pub-0000000000000000"
            spellCheck={false}
            autoComplete="off"
            hint={`ads.txt otomatis di ${siteUrl}/ads.txt`}
          />
        </div>
        <SwitchField
          name="google_adsense_auto_ads"
          title="Muat kode Auto Ads"
          description="Aktifkan hanya setelah website disetujui AdSense; iklan memengaruhi performa dan pengalaman pengunjung."
          defaultChecked={settings.google_adsense_auto_ads}
        />
        {settings.google_adsense_client_id && (
          <div className="bg-surface border-border/70 flex items-center gap-2 rounded-xl border py-1.5 pl-3 pr-1.5">
            <div className="min-w-0 flex-1">
              <p className="text-muted text-caption2 font-semibold uppercase tracking-wide">
                Endpoint ads.txt
              </p>
              <p className="truncate font-mono text-caption1">
                {siteUrl}/ads.txt
              </p>
            </div>
            <CopyButton
              value={`${siteUrl}/ads.txt`}
              size="xs"
              label="Salin URL ads.txt"
              successMessage="URL ads.txt disalin"
              className="size-8 rounded-lg bg-transparent hover:bg-surface-2"
            />
            <a
              href={`${siteUrl}/ads.txt`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Buka ads.txt"
              className="text-muted hover:bg-surface-2 hover:text-foreground grid size-8 shrink-0 place-items-center rounded-lg transition-colors"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        )}
      </FormSection>
    </SettingsTabForm>
  );
}
