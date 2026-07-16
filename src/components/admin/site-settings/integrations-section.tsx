import { PlugZap } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { SiteSettingsRow } from "@/lib/types/database";
import { SettingsBooleanField } from "./settings-boolean-field";
import { SettingsSection } from "./settings-section";

export function IntegrationsSection({
  settings,
  siteUrl,
}: {
  settings: SiteSettingsRow;
  siteUrl: string;
}) {
  return (
    <SettingsSection
      id="integrasi"
      title="Search Console, Analytics, dan iklan"
      description="Kode integrasi hanya dimuat bila formatnya valid dan fiturnya diaktifkan."
      icon={<PlugZap className="h-5 w-5" />}
    >
      <div>
        <p className="mb-4 text-sm font-semibold">Verifikasi mesin pencari</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Google verification" htmlFor="google_site_verification" hint="Isi nilai content, bukan seluruh tag meta.">
            <Input id="google_site_verification" name="google_site_verification" defaultValue={settings.google_site_verification ?? ""} />
          </Field>
          <Field label="Bing verification" htmlFor="bing_site_verification" hint="Isi nilai msvalidate.01 bila digunakan.">
            <Input id="bing_site_verification" name="bing_site_verification" defaultValue={settings.bing_site_verification ?? ""} />
          </Field>
        </div>
      </div>
      <Field label="Google Analytics ID" htmlFor="google_analytics_id" hint="Format G-XXXXXXXXXX atau GT-XXXXXXXXXX.">
        <Input id="google_analytics_id" name="google_analytics_id" defaultValue={settings.google_analytics_id ?? ""} />
      </Field>
      <div className="border-border space-y-4 border-t pt-5">
        <Field label="Google AdSense client ID" htmlFor="google_adsense_client_id" hint="Format ca-pub- diikuti 16 angka.">
          <Input id="google_adsense_client_id" name="google_adsense_client_id" defaultValue={settings.google_adsense_client_id ?? ""} placeholder="ca-pub-0000000000000000" />
        </Field>
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
  );
}

