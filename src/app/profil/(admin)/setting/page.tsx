import { requireFeature } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { buildAdminPageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/admin/page-header";
import { SiteSettingsForm } from "@/components/admin/site-settings";

export const metadata = buildAdminPageMetadata("Konfigurasi Website");

export default async function SettingPage() {
  await requireFeature("setting");
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Konfigurasi website"
        description="Kelola identitas, konten, tampilan, SEO, dan integrasi tanpa mengubah source code."
      />
      <SiteSettingsForm settings={settings} />
    </div>
  );
}
