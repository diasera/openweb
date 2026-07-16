import { requireFeature } from "@/lib/auth";
import { buildAdminPageMetadata } from "@/lib/seo";
import { PostEditor } from "@/components/admin/post-editor";

export const metadata = buildAdminPageMetadata("Tulis Artikel");

export default async function NewPostPage() {
  await requireFeature("blog");
  return <PostEditor />;
}
