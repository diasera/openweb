import { notFound } from "next/navigation";
import { requireFeature } from "@/lib/auth";
import { getPostById } from "@/lib/admin/blog";
import { buildAdminPageMetadata } from "@/lib/seo";
import { PostEditor } from "@/components/admin/post-editor";

export const metadata = buildAdminPageMetadata("Edit Artikel");

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireFeature("blog");
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();
  return <PostEditor post={post} />;
}
