import { notFound } from "next/navigation";
import { requireFeature } from "@/lib/auth";
import { getPostById } from "@/lib/admin/blog";
import { getSettings } from "@/lib/data";
import { buildAdminPageMetadata } from "@/lib/seo";
import { getSiteOrigin } from "@/lib/site-config";
import { PostEditor } from "@/components/admin/blog/post-editor";

export const metadata = buildAdminPageMetadata("Edit Artikel");

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireFeature("blog");
  const { id } = await params;
  const [post, settings] = await Promise.all([getPostById(id), getSettings()]);
  if (!post) notFound();
  return (
    <PostEditor
      // Remount saat berpindah artikel agar draf editor tidak terbawa.
      key={post.id}
      post={post}
      siteName={settings.site_name}
      siteUrl={getSiteOrigin(settings)}
      logoUrl={settings.logo_url}
    />
  );
}
