import { Palette } from "lucide-react";
import { ImageField } from "@/components/admin/image-field";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { rgbChannelsToHex } from "@/lib/theme";
import type { SiteSettingsRow } from "@/lib/types/database";
import { SettingsSection } from "./settings-section";

export function BrandingSection({ settings }: { settings: SiteSettingsRow }) {
  const primary = settings.theme?.primary
    ? rgbChannelsToHex(settings.theme.primary)
    : "#e60023";
  const accent = settings.theme?.accent
    ? rgbChannelsToHex(settings.theme.accent)
    : primary;
  const heroNeedsDimensionBackfill = Boolean(
    settings.hero_image_url &&
      (!settings.hero_image_width || !settings.hero_image_height),
  );

  return (
    <SettingsSection
      id="tampilan"
      title="Branding dan halaman depan"
      description="Logo, warna, dan hero memakai konfigurasi yang sama di seluruh tampilan."
      icon={<Palette className="h-5 w-5" />}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <ImageField name="logo" label="Logo utama" initialUrl={settings.logo_url} profile="site-logo" removable hint="Gunakan gambar persegi transparan bila tersedia." />
        <ImageField name="favicon" label="Favicon" initialUrl={settings.favicon_url} profile="site-favicon" removable hint="Disarankan gambar persegi minimal 48 × 48 px." />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Warna utama" htmlFor="primary_hex">
          <input id="primary_hex" name="primary_hex" type="color" defaultValue={primary} className="border-border h-11 w-full cursor-pointer rounded-2xl border bg-transparent p-1" />
        </Field>
        <Field label="Warna aksen" htmlFor="accent_hex">
          <input id="accent_hex" name="accent_hex" type="color" defaultValue={accent} className="border-border h-11 w-full cursor-pointer rounded-2xl border bg-transparent p-1" />
        </Field>
      </div>
      <div className="border-border border-t pt-5">
        <p className="mb-4 text-sm font-semibold">Hero halaman depan</p>
        <div className="space-y-4">
          <Field label="Judul hero" htmlFor="hero_title">
            <Input id="hero_title" name="hero_title" maxLength={120} defaultValue={settings.hero_title ?? ""} />
          </Field>
          <Field label="Subjudul hero" htmlFor="hero_subtitle">
            <Input id="hero_subtitle" name="hero_subtitle" maxLength={220} defaultValue={settings.hero_subtitle ?? ""} />
          </Field>
          <ImageField
            name="hero_image"
            label="Gambar hero"
            initialUrl={settings.hero_image_url}
            initialDimensions={
              settings.hero_image_width && settings.hero_image_height
                ? {
                    width: settings.hero_image_width,
                    height: settings.hero_image_height,
                  }
                : null
            }
            profile="site-hero"
            wide
            removable
            hint={
              heroNeedsDimensionBackfill
                ? "Foto lama ini belum memiliki metadata ukuran. Cukup simpan konfigurasi sekali agar optimasi responsif aktif tanpa mengubah atau memotong gambar."
                : "Rasio hero mengikuti hasil akhir editor. Pilih Asli atau Bebas untuk panorama/lonjong; halaman depan tidak akan memotong foto lagi."
            }
          />
        </div>
      </div>
    </SettingsSection>
  );
}
