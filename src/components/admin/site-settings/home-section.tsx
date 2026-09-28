"use client";

import { useCallback, useState, type ChangeEvent } from "react";
import { House } from "lucide-react";
import {
  ImageField,
  type ImageFieldPreview,
} from "@/components/admin/image-field";
import { SITE_CONFIG_LIMITS } from "@/lib/site-config/client";
import type { SiteSettingsRow } from "@/lib/types/database";
import { saveHomeSettings } from "@/app/profil/(admin)/setting/actions";
import { TextField, TextAreaField } from "./form-fields";
import { HeroPreview } from "./hero-preview";
import { SettingsSection } from "./settings-section";
import { SettingsTabForm } from "./settings-tab-form";
import { useSettingsSectionForm } from "./use-settings-section-form";

type HeroCopyField = "hero_badge" | "hero_title" | "hero_subtitle";

function samePreview(a: ImageFieldPreview, b: ImageFieldPreview) {
  return (
    a.url === b.url &&
    a.dimensions?.width === b.dimensions?.width &&
    a.dimensions?.height === b.dimensions?.height
  );
}

/**
 * Tab Beranda: hero halaman depan (label, judul, subjudul, foto — dengan
 * pratinjau langsung) + konten tentang/footer. Hero tidak membaca identitas
 * selain Nama website sebagai fallback judul kosong.
 */
export function HomeSection({
  settings,
  onDirtyChange,
}: {
  settings: SiteSettingsRow;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { formRef, dirty, handleSubmit, pending, fieldErrors } =
    useSettingsSectionForm("home", saveHomeSettings, "Beranda tersimpan", {
      onDirtyChange,
    });
  const heroNeedsDimensionBackfill = Boolean(
    settings.hero_image_url &&
      (!settings.hero_image_width || !settings.hero_image_height),
  );
  const initialHeroDimensions =
    settings.hero_image_width && settings.hero_image_height
      ? { width: settings.hero_image_width, height: settings.hero_image_height }
      : null;
  const [heroCopy, setHeroCopy] = useState<Record<HeroCopyField, string>>({
    hero_badge: settings.hero_badge ?? "",
    hero_title: settings.hero_title ?? "",
    hero_subtitle: settings.hero_subtitle ?? "",
  });
  const [heroImage, setHeroImage] = useState<ImageFieldPreview>({
    url: settings.hero_image_url,
    dimensions: initialHeroDimensions,
  });
  const syncHeroImage = useCallback((next: ImageFieldPreview) => {
    setHeroImage((current) => (samePreview(current, next) ? current : next));
  }, []);
  const editHeroCopy =
    (field: HeroCopyField) => (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target;
      setHeroCopy((current) => ({ ...current, [field]: value }));
    };

  return (
    <SettingsTabForm
      formRef={formRef}
      dirty={dirty}
      onSubmit={handleSubmit}
      pending={pending}
    >
      <SettingsSection
        title="Beranda dan konten"
        description="Hero halaman depan serta visi, misi, dan teks footer yang dipakai halaman Tentang."
        icon={<House className="h-5 w-5" />}
      >
        <HeroPreview
          settings={{ site_name: settings.site_name, ...heroCopy }}
          image={heroImage}
        />

        <TextField
          label="Label hero (opsional)"
          id="hero_badge"
          name="hero_badge"
          defaultValue={settings.hero_badge ?? ""}
          maxLength={SITE_CONFIG_LIMITS.heroBadge}
          error={fieldErrors.hero_badge}
          hint="Chip kecil di pojok kiri atas foto, mis. “Pendaftaran dibuka”. Kosongkan untuk menyembunyikan. Pada foto panorama di layar sempit, label disembunyikan agar tidak menimpa judul."
          onChange={editHeroCopy("hero_badge")}
        />
        <TextField
          label="Judul hero"
          id="hero_title"
          name="hero_title"
          defaultValue={settings.hero_title ?? ""}
          placeholder={settings.site_name}
          maxLength={SITE_CONFIG_LIMITS.heroTitle}
          error={fieldErrors.hero_title}
          hint="Kosongkan untuk memakai Nama website dari tab Identitas."
          onChange={editHeroCopy("hero_title")}
        />
        <TextField
          label="Subjudul hero"
          id="hero_subtitle"
          name="hero_subtitle"
          defaultValue={settings.hero_subtitle ?? ""}
          maxLength={SITE_CONFIG_LIMITS.heroSubtitle}
          error={fieldErrors.hero_subtitle}
          onChange={editHeroCopy("hero_subtitle")}
        />
        <ImageField
          name="hero_image"
          label="Gambar hero"
          initialUrl={settings.hero_image_url}
          initialDimensions={initialHeroDimensions}
          profile="site-hero"
          removable
          withDimensions
          onPreviewChange={syncHeroImage}
          hint={
            heroNeedsDimensionBackfill
              ? "Foto lama ini belum memiliki metadata ukuran. Cukup simpan konfigurasi sekali agar optimasi responsif aktif tanpa mengubah atau memotong gambar."
              : "Rasio hero mengikuti hasil akhir editor. Pilih Asli atau Bebas untuk panorama/lonjong; halaman depan tidak akan memotong foto lagi."
          }
        />

        <div className="border-border space-y-4 border-t pt-5">
          <TextAreaField
            label="Visi / tujuan"
            id="visi"
            name="visi"
            rows={3}
            maxLength={SITE_CONFIG_LIMITS.visi}
            defaultValue={settings.visi ?? ""}
            error={fieldErrors.visi}
          />
          <TextAreaField
            label="Misi / prinsip"
            id="misi"
            name="misi"
            rows={6}
            defaultValue={settings.misi?.join("\n") ?? ""}
            error={fieldErrors.misi}
            hint="Tulis satu poin per baris, maksimal 20 poin."
          />
          <TextField
            label="Teks footer"
            id="footer_text"
            name="footer_text"
            defaultValue={settings.footer_text ?? ""}
            maxLength={SITE_CONFIG_LIMITS.footerText}
            error={fieldErrors.footer_text}
            hint="Tidak perlu memasukkan tahun; tahun dapat berubah otomatis di tampilan."
          />
        </div>
      </SettingsSection>
    </SettingsTabForm>
  );
}
