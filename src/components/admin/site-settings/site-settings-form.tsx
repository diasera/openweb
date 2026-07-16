"use client";

import { Save } from "lucide-react";
import { useAdminFormAction } from "@/components/admin/use-admin-form-action";
import { saveSiteSettings } from "@/app/profil/(admin)/setting/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getSiteOrigin } from "@/lib/site-config/client";
import type { SiteSettingsRow } from "@/lib/types/database";
import { BrandingSection } from "./branding-section";
import { ContactSection } from "./contact-section";
import { ContentSection } from "./content-section";
import { IdentitySection } from "./identity-section";
import { IntegrationsSection } from "./integrations-section";
import { SeoSection } from "./seo-section";

const NAVIGATION = [
  ["identitas", "Identitas"],
  ["tampilan", "Tampilan"],
  ["konten", "Konten"],
  ["seo", "SEO"],
  ["integrasi", "Integrasi"],
  ["kontak", "Kontak"],
] as const;

export function SiteSettingsForm({ settings }: { settings: SiteSettingsRow }) {
  const siteUrl = getSiteOrigin(settings);
  const { onSubmit, pending } = useAdminFormAction({
    action: saveSiteSettings,
    successMessage: "Konfigurasi website tersimpan",
    successDescription:
      "Metadata dan tampilan publik akan memakai pengaturan terbaru.",
    requestErrorMessage:
      "Koneksi terputus saat menyimpan konfigurasi. Coba lagi.",
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card className="no-scrollbar sticky top-3 z-20 overflow-x-auto p-2 shadow-ios">
        <nav className="flex min-w-max gap-1" aria-label="Bagian konfigurasi website">
          {NAVIGATION.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="hover:bg-surface-2 rounded-full px-3.5 py-2 text-sm font-medium"
            >
              {label}
            </a>
          ))}
        </nav>
      </Card>

      <IdentitySection settings={settings} />
      <BrandingSection settings={settings} />
      <ContentSection settings={settings} />
      <SeoSection settings={settings} siteUrl={siteUrl} />
      <IntegrationsSection settings={settings} siteUrl={siteUrl} />
      <ContactSection settings={settings} />

      <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex justify-end py-2 md:bottom-4">
        <Button type="submit" disabled={pending} className="shadow-ios">
          <Save className="h-4 w-4" />
          {pending ? "Menyimpan…" : "Simpan konfigurasi"}
        </Button>
      </div>
    </form>
  );
}
