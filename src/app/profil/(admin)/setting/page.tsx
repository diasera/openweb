import { requireFeature } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { buildAdminPageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/ui/page-header";
import { SiteSettingsForm } from "@/components/admin/site-settings";
import { getSiteOrigin, isSiteSettingsTabId } from "@/lib/site-config";

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
      {/* Origin dihitung di server: fallback env Vercel tidak tersedia di
          browser, jadi menghitungnya di klien memicu hydration mismatch. */}
      <SiteSettingsForm
        settings={settings}
        siteUrl={getSiteOrigin(settings)}
        activeTab={activeTab}
      />
    </div>
  );
}
