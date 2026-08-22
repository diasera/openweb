import { requireFeature } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { buildAdminPageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/admin/page-header";
import { SiteSettingsForm } from "@/components/admin/site-settings";
import { isSiteSettingsTabId } from "@/lib/site-config/client";

export const metadata = buildAdminPageMetadata("Konfigurasi Website");

export default async function SettingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireFeature("setting");
  const settings = await getSettings();
  const { tab } = await searchParams;
  const activeTab = tab && isSiteSettingsTabId(tab) ? tab : "identity";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Konfigurasi website"
        description="Kelola identitas, beranda, SEO, dan integrasi tanpa mengubah source code."
      />
      <SiteSettingsForm settings={settings} activeTab={activeTab} />
    </div>
  );
}
