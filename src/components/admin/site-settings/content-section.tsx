import { FileText } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SiteSettingsRow } from "@/lib/types/database";
import { SettingsSection } from "./settings-section";

export function ContentSection({ settings }: { settings: SiteSettingsRow }) {
  return (
    <SettingsSection
      id="konten"
      title="Tentang dan footer"
      description="Konten dasar yang dapat dipakai kelas, sekolah, komunitas, maupun organisasi."
      icon={<FileText className="h-5 w-5" />}
    >
      <Field label="Visi / tujuan" htmlFor="visi">
        <Textarea id="visi" name="visi" rows={3} maxLength={600} defaultValue={settings.visi ?? ""} />
      </Field>
      <Field label="Misi / prinsip" htmlFor="misi" hint="Tulis satu poin per baris, maksimal 20 poin.">
        <Textarea id="misi" name="misi" rows={6} defaultValue={settings.misi?.join("\n") ?? ""} />
      </Field>
      <Field label="Teks footer" htmlFor="footer_text" hint="Tidak perlu memasukkan tahun; tahun dapat berubah otomatis di tampilan.">
        <Input id="footer_text" name="footer_text" maxLength={220} defaultValue={settings.footer_text ?? ""} />
      </Field>
    </SettingsSection>
  );
}

