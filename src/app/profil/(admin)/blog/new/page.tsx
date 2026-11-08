import { requireFeature } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { buildAdminPageMetadata } from "@/lib/seo";
import { getSiteOrigin } from "@/lib/site-config";
import { PostEditor } from "@/components/admin/blog/post-editor";

export const metadata = buildAdminPageMetadata("Tulis Artikel");

export default async function NewPostPage() {
  await requireFeature("blog");
  const settings = await getSettings();
  return (
    <PostEditor
      siteName={settings.site_name}
      siteUrl={getSiteOrigin(settings)}
      logoUrl={settings.logo_url}
    />
  );
}
