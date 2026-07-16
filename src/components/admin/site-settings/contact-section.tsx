import { Contact } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SOCIAL_NETWORKS } from "@/lib/site-config/client";
import type { SiteSettingsRow } from "@/lib/types/database";
import { SettingsSection } from "./settings-section";

export function ContactSection({ settings }: { settings: SiteSettingsRow }) {
  return (
    <SettingsSection
      id="kontak"
      title="Kontak dan media sosial"
      description="Informasi publik untuk halaman tentang serta structured data organisasi."
      icon={<Contact className="h-5 w-5" />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email publik" htmlFor="contact_email">
          <Input id="contact_email" name="contact_email" type="email" defaultValue={settings.contact_email ?? ""} />
        </Field>
        <Field label="Telepon publik" htmlFor="contact_phone">
          <Input id="contact_phone" name="contact_phone" type="tel" defaultValue={settings.contact_phone ?? ""} />
        </Field>
      </div>
      <Field label="Alamat" htmlFor="contact_address">
        <Textarea id="contact_address" name="contact_address" rows={3} maxLength={300} defaultValue={settings.contact_address ?? ""} />
      </Field>
      <div className="border-border border-t pt-5">
        <p className="mb-4 text-sm font-semibold">Tautan sosial</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {SOCIAL_NETWORKS.map((network) => (
            <Field key={network.key} label={network.label} htmlFor={`social_${network.key}`}>
              <Input
                id={`social_${network.key}`}
                name={`social_${network.key}`}
                type="url"
                defaultValue={settings.social?.[network.key] ?? ""}
                placeholder={network.placeholder}
              />
            </Field>
          ))}
        </div>
      </div>
    </SettingsSection>
  );
}
