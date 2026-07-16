import { Building2 } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getContentLabels,
  LOCALE_OPTIONS,
  SITE_TYPE_OPTIONS,
  TIMEZONE_OPTIONS,
} from "@/lib/site-config/client";
import type { SiteSettingsRow } from "@/lib/types/database";
import { SelectField } from "./select-field";
import { SettingsSection } from "./settings-section";

export function IdentitySection({ settings }: { settings: SiteSettingsRow }) {
  const labels = getContentLabels(settings);
  return (
    <SettingsSection
      id="identitas"
      title="Identitas website"
      description="Satu sumber identitas untuk judul, navigasi, hasil pencarian, dan aplikasi web."
      icon={<Building2 className="h-5 w-5" />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama website" htmlFor="site_name" hint="Nama singkat yang konsisten di seluruh website.">
          <Input id="site_name" name="site_name" defaultValue={settings.site_name} required />
        </Field>
        <Field label="Nama alternatif" htmlFor="site_alternate_name" hint="Nama lengkap atau singkatan lain yang dikenal publik.">
          <Input id="site_alternate_name" name="site_alternate_name" defaultValue={settings.site_alternate_name ?? ""} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField id="site_type" name="site_type" label="Jenis website" defaultValue={settings.site_type} options={SITE_TYPE_OPTIONS} />
        <SelectField id="locale" name="locale" label="Bahasa" defaultValue={settings.locale} options={LOCALE_OPTIONS} />
        <SelectField id="timezone" name="timezone" label="Zona waktu" defaultValue={settings.timezone} options={TIMEZONE_OPTIONS} />
      </div>
      <Field label="Deskripsi umum" htmlFor="description" hint="Ringkasan identitas; menjadi fallback jika deskripsi SEO khusus kosong.">
        <Textarea id="description" name="description" rows={3} maxLength={320} defaultValue={settings.description ?? ""} />
      </Field>
      <Field label="Tagline" htmlFor="tagline">
        <Input id="tagline" name="tagline" maxLength={140} defaultValue={settings.tagline ?? ""} />
      </Field>
      <div>
        <p className="mb-3 text-sm font-semibold">Sebutan konten</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Satu anggota" htmlFor="member_label_singular" hint="Contoh: siswa, mahasiswa, anggota.">
            <Input id="member_label_singular" name="member_label_singular" defaultValue={labels.memberSingular} required />
          </Field>
          <Field label="Banyak anggota" htmlFor="member_label_plural">
            <Input id="member_label_plural" name="member_label_plural" defaultValue={labels.memberPlural} required />
          </Field>
          <Field label="Nomor identitas" htmlFor="member_identifier_label" hint="Contoh: NIS, NIM, ID anggota.">
            <Input id="member_identifier_label" name="member_identifier_label" defaultValue={labels.memberIdentifier} required />
          </Field>
          <Field label="Kelompok inti" htmlFor="member_core_group_label" hint="Contoh: Pengurus, Tim inti, Guru.">
            <Input id="member_core_group_label" name="member_core_group_label" defaultValue={labels.memberCoreGroup} required />
          </Field>
        </div>
      </div>
    </SettingsSection>
  );
}
