import { requireFeature } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { buildAdminPageMetadata } from "@/lib/seo";
import { getSiteOrigin, isSiteSettingsTabId } from "@/lib/site-config";
import { AdminPage } from "@/components/admin/admin-page";
import { SiteSettingsForm } from "@/components/admin/settings/site-settings-form";

export const metadata = buildAdminPageMetadata("Pengaturan");

export default async function SettingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireFeature("setting");
  const [settings, { tab }] = await Promise.all([getSettings(), searchParams]);
  const activeTab = tab && isSiteSettingsTabId(tab) ? tab : "identity";

  return (
    <AdminPage
      feature="setting"
      title="Pengaturan"
      description="Identitas, halaman depan, SEO, dan integrasi — semua perubahan langsung tampil di website tanpa mengubah kode."
      width="wide"
    >
      {/* Origin dihitung di server: fallback env Vercel tidak tersedia di
          browser, jadi menghitungnya di klien memicu hydration mismatch. */}
      <SiteSettingsForm
        key={settings.updated_at}
        settings={settings}
        siteUrl={getSiteOrigin(settings)}
        activeTab={activeTab}
      />
    </AdminPage>
  );
}
