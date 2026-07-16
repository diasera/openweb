import { Search } from "lucide-react";
import { ImageField } from "@/components/admin/image-field";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SiteSettingsRow } from "@/lib/types/database";
import { KeywordEditor } from "./keyword-editor";
import { SettingsBooleanField } from "./settings-boolean-field";
import { SettingsSection } from "./settings-section";

export function SeoSection({
  settings,
  siteUrl,
}: {
  settings: SiteSettingsRow;
  siteUrl: string;
}) {
  return (
    <SettingsSection
      id="seo"
      title="SEO dan hasil pencarian"
      description="Atur canonical URL, judul, cuplikan, gambar sosial, dan strategi frasa pencarian dari satu tempat."
      icon={<Search className="h-5 w-5" />}
    >
      <Field label="URL utama (canonical)" htmlFor="site_url" hint="Gunakan origin HTTPS tanpa path, misalnya https://contoh.org.">
        <Input id="site_url" name="site_url" type="url" defaultValue={siteUrl} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Judul halaman depan" htmlFor="seo_home_title" hint="Buat judul unik, deskriptif, dan ringkas.">
          <Input id="seo_home_title" name="seo_home_title" maxLength={80} defaultValue={settings.seo_home_title ?? ""} placeholder="Nama Website — Topik Utama" />
        </Field>
        <Field label="Nama website di Google" htmlFor="seo_site_name_preview" hint="Bersumber dari Nama website pada bagian Identitas.">
          <Input id="seo_site_name_preview" value={settings.site_name} readOnly disabled />
        </Field>
      </div>
      <Field label="Deskripsi hasil pencarian" htmlFor="seo_home_description" hint="Ringkas isi halaman secara spesifik; Google dapat memilih cuplikan lain sesuai kueri.">
        <Textarea id="seo_home_description" name="seo_home_description" rows={4} maxLength={220} defaultValue={settings.seo_home_description ?? ""} />
      </Field>
      <ImageField name="seo_image" label="Gambar sosial default" initialUrl={settings.seo_image_url} profile="site-seo" wide removable hint="Editor memakai rasio sosial 1200 × 630 untuk Open Graph dan kartu sosial." />

      <div className="border-border border-t pt-5">
        <div className="mb-3">
          <p className="text-sm font-semibold">Frasa pencarian dan topik konten</p>
          <p className="text-muted mt-1 text-xs leading-relaxed">
            Tambahkan hingga 100 frasa—termasuk 20 atau lebih bila relevan. Google tidak memakai meta keywords untuk menentukan ranking; daftar ini membantu menjaga strategi judul, artikel, dan deskripsi tetap konsisten.
          </p>
        </div>
        <KeywordEditor initialValue={settings.keywords} />
      </div>

      <SettingsBooleanField
        name="seo_indexing_enabled"
        title="Izinkan mesin pencari mengindeks website"
        description="Matikan saat website masih disiapkan. Setelah aktif, sitemap dan canonical tetap perlu dirayapi ulang."
        defaultChecked={settings.seo_indexing_enabled}
      />

      <div className="bg-surface-2 rounded-2xl p-4 text-sm">
        <p className="font-semibold">Endpoint teknis otomatis</p>
        <div className="text-muted mt-2 space-y-1 break-all text-xs">
          <p>{siteUrl}/sitemap.xml</p>
          <p>{siteUrl}/robots.txt</p>
        </div>
        <p className="text-muted mt-2 text-xs leading-relaxed">
          Pengaturan teknis membantu Google memahami website, tetapi tidak dapat menjamin peringkat tertentu.
        </p>
      </div>
    </SettingsSection>
  );
}
