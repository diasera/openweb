"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireFeature } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { slugify, withPreviousSlug } from "@/lib/utils/slug";
import { checkedMutation } from "@/lib/database/mutation";
import { findAvailableSlug } from "@/lib/database/unique-slug";
import { INVALID_INPUT, isOneOf, isValidId } from "@/lib/admin/guard";
import { adminFeatureHref } from "@/lib/constants";
import type { Database, PostStatus } from "@/lib/types/database";
import {
  validationErrorMessage,
  type ActionResult,
} from "@/lib/action-result";
import { syncMemberMentions } from "@/lib/members/mentions";
import { blogMentionValues } from "@/lib/members/mention-values";
import {
  articleImageSources,
  normalizeArticleHtml,
  normalizeArticleJson,
} from "@/lib/blog/content";
import {
  isManagedImageUrl,
  removeManagedImagesIfUnused,
  uploadManagedImage,
  type ManagedImageAsset,
} from "@/lib/assets/managed-images";
import { revalidateSeoIndexes } from "@/lib/seo/revalidate";

const POST_STATUSES = ["draft", "published", "archived"] as const satisfies readonly PostStatus[];

const schema = z.object({
  id: z.union([z.literal(""), z.uuid("ID artikel tidak valid")]),
  title: z.string().trim().min(1, "Judul wajib diisi").max(160),
  excerpt: z.string().trim().max(300),
  category: z.string().trim().max(40),
  tags: z.string().trim().max(200),
  content_html: z.string().max(300000),
  content_json: z.string().max(600000),
  status: z.enum(POST_STATUSES),
});

type Sb = SupabaseClient<Database>;

/**
 * Gambar artikel (cover maupun inline) masih dipakai bila nama objeknya muncul
 * di cover_image_url atau content_html artikel mana pun. Gagal cek = dipertahankan.
 */
async function isBlogAssetReferenced(sb: Sb, url: string): Promise<boolean> {
  const name = new URL(url).pathname.split("/").pop();
  if (!name) return true;
  const { data, error } = await sb.rpc("blog_asset_paths_in_use", {
    p_paths: [decodeURIComponent(name)],
  });
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

async function removeBlogAssetsIfUnused(sb: Sb, assets: ManagedImageAsset[]) {
  await removeManagedImagesIfUnused(assets, (url) => isBlogAssetReferenced(sb, url));
}

/** Gambar inline terkelola yang ada di `previousHtml` tetapi tidak lagi di `nextHtml`. */
function droppedInlineImages(previousHtml: string, nextHtml = ""): ManagedImageAsset[] {
  const kept = new Set(articleImageSources(nextHtml));
  return articleImageSources(previousHtml)
    .filter((url) => !kept.has(url) && isManagedImageUrl("blog-inline", url))
    .map((url) => ({ kind: "blog-inline" as const, url }));
}

/** Artikel tampil di admin, dasbor, /blog, detailnya, sitemap, dan feed. */
function revalidateBlog(slugs: ReadonlyArray<string | null | undefined>) {
  revalidatePath(adminFeatureHref("blog"));
  revalidatePath("/profil");
  revalidatePath("/blog");
  for (const slug of new Set(slugs)) if (slug) revalidatePath(`/blog/${slug}`);
  revalidateSeoIndexes();
}

function parseTags(value: string): string[] {
  return value
    ? [...new Set(value.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean))]
    : [];
}

export async function savePost(formData: FormData): Promise<ActionResult & { id?: string }> {
  const admin = await requireFeature("blog");
  const parsed = schema.safeParse({
    id: formData.get("id") ?? "",
    title: formData.get("title") ?? "",
    excerpt: formData.get("excerpt") ?? "",
    category: formData.get("category") ?? "",
    tags: formData.get("tags") ?? "",
    content_html: formData.get("content_html") ?? "",
    content_json: formData.get("content_json") ?? "",
    status: formData.get("status") ?? "draft",
  });
  if (!parsed.success) return { error: validationErrorMessage(parsed) };
  const d = parsed.data;
  const id = d.id || null;
  const sb = createAdminSupabase();

  let contentJson: unknown = null;
  try {
    contentJson = d.content_json ? normalizeArticleJson(JSON.parse(d.content_json)) : null;
  } catch {
    return { error: "Konten editor tidak valid. Muat ulang halaman agar isi artikel tidak rusak." };
  }

  const current = id
    ? await checkedMutation(
        "blog.load-update",
        "Gagal membaca artikel sebelum diperbarui.",
        sb
          .from("blog_posts")
          .select("id, slug, previous_slugs, published_at, author_name, cover_image_url, content_html")
          .eq("id", id)
          .maybeSingle(),
      )
    : null;
  if (current && !current.ok) return { error: current.error };

  const slugResult = await findAvailableSlug(
    "blog",
    slugify(d.title) || "artikel",
    id,
    (candidate) => sb.from("blog_posts").select("id").eq("slug", candidate).maybeSingle(),
    current?.data.slug,
  );
  if (!slugResult.ok) return { error: slugResult.error };
  const slug = slugResult.data;

  // published_at hanya di-set saat pertama kali terbit.
  const publishedAt =
    d.status === "published"
      ? (current?.data.published_at ?? new Date().toISOString())
      : undefined;
  const tags = parseTags(d.tags);

  // Upload dilakukan terakhir setelah semua validasi/query awal lolos agar
  // file baru tidak menjadi yatim bila ID atau konten artikel bermasalah.
  let uploadedCover: ManagedImageAsset | undefined;
  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    const uploaded = await uploadManagedImage("blog-cover", cover);
    if (!uploaded.ok) return { error: uploaded.error };
    uploadedCover = uploaded.asset;
  }
  const removeCover = !uploadedCover && formData.get("cover_remove") === "1";
  const coverChanged = Boolean(uploadedCover || removeCover);

  const contentHtml = normalizeArticleHtml(d.content_html);
  const payload = {
    title: d.title,
    slug,
    // URL yang pernah terbit tetap hidup: slug lama dialihkan ke slug baru.
    ...(current?.data.published_at && current.data.slug !== slug
      ? { previous_slugs: withPreviousSlug(current.data.previous_slugs, current.data.slug, slug) }
      : {}),
    excerpt: d.excerpt || null,
    category: d.category || null,
    tags: tags.length ? tags : null,
    content_html: contentHtml,
    content_json: contentJson,
    status: d.status,
    ...(uploadedCover
      ? { cover_image_url: uploadedCover.url }
      : removeCover
        ? { cover_image_url: null }
        : {}),
    ...(publishedAt ? { published_at: publishedAt } : {}),
    ...(id ? {} : { author_id: admin.id, author_name: admin.name }),
  };
  const mentionValues = blogMentionValues({
    title: d.title,
    excerpt: d.excerpt,
    category: d.category,
    tags,
    // Artikel baru ditulis admin ini; artikel lama memakai penulis tersimpan.
    author_name: current ? current.data.author_name : admin.name,
    content_html: d.content_html,
  });

  if (id) {
    const updateQuery = sb.from("blog_posts").update(payload).eq("id", id);
    // Cover yang diganti dijaga terhadap perubahan dari sesi lain.
    const guardedUpdate = coverChanged
      ? current?.data.cover_image_url
        ? updateQuery.eq("cover_image_url", current.data.cover_image_url)
        : updateQuery.is("cover_image_url", null)
      : updateQuery;
    const saved = await checkedMutation(
      "blog.update",
      "Gagal memperbarui artikel.",
      guardedUpdate.select("id").maybeSingle(),
      {
        duplicateMessage: "URL artikel sudah dipakai. Coba judul lain.",
        notFoundMessage: "Artikel berubah di sesi lain. Muat ulang sebelum menyimpan kembali.",
      },
    );
    if (!saved.ok) {
      if (uploadedCover) await removeBlogAssetsIfUnused(sb, [uploadedCover]);
      return { error: saved.error };
    }
    const replacedCover =
      coverChanged && current?.data.cover_image_url && current.data.cover_image_url !== uploadedCover?.url
        ? [{ kind: "blog-cover" as const, url: current.data.cover_image_url }]
        : [];
    await removeBlogAssetsIfUnused(sb, [
      ...replacedCover,
      ...droppedInlineImages(current?.data.content_html ?? "", contentHtml),
    ]);
    await syncMemberMentions({ blogPostId: id }, mentionValues);
    revalidateBlog([current?.data.slug, slug]);
    return { id };
  }

  const saved = await checkedMutation(
    "blog.create",
    "Gagal membuat artikel.",
    sb.from("blog_posts").insert(payload).select("id").maybeSingle(),
    { duplicateMessage: "URL artikel sudah dipakai. Coba judul lain." },
  );
  if (!saved.ok) {
    if (uploadedCover) await removeBlogAssetsIfUnused(sb, [uploadedCover]);
    return { error: saved.error };
  }
  await syncMemberMentions({ blogPostId: saved.data.id }, mentionValues);
  revalidateBlog([slug]);
  return { id: saved.data.id };
}

export async function setPostStatus(id: string, status: PostStatus): Promise<ActionResult> {
  await requireFeature("blog");
  if (!isValidId(id) || !isOneOf(status, POST_STATUSES)) return INVALID_INPUT;
  const sb = createAdminSupabase();
  const current = await checkedMutation(
    "blog.load-status",
    "Gagal membaca status artikel.",
    sb.from("blog_posts").select("id, slug, published_at").eq("id", id).maybeSingle(),
  );
  if (!current.ok) return { error: current.error };

  const patch: { status: PostStatus; published_at?: string } = { status };
  if (status === "published" && !current.data.published_at) {
    patch.published_at = new Date().toISOString();
  }
  const saved = await checkedMutation(
    "blog.status",
    "Gagal mengubah status artikel.",
    sb.from("blog_posts").update(patch).eq("id", id).select("id").maybeSingle(),
  );
  if (!saved.ok) return { error: saved.error };
  revalidateBlog([current.data.slug]);
  return {};
}

export async function deletePost(id: string): Promise<ActionResult> {
  await requireFeature("blog");
  if (!isValidId(id)) return INVALID_INPUT;
  const sb = createAdminSupabase();
  const deleted = await checkedMutation(
    "blog.delete",
    "Gagal menghapus artikel.",
    sb
      .from("blog_posts")
      .delete()
      .eq("id", id)
      .select("id, slug, cover_image_url, content_html")
      .maybeSingle(),
  );
  if (!deleted.ok) return { error: deleted.error };
  await removeBlogAssetsIfUnused(sb, [
    ...(deleted.data.cover_image_url
      ? [{ kind: "blog-cover" as const, url: deleted.data.cover_image_url }]
      : []),
    ...droppedInlineImages(deleted.data.content_html),
  ]);
  revalidateBlog([deleted.data.slug]);
  return {};
}
