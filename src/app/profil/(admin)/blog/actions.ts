"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFeature } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils/slug";
import {
  checkedDatabaseCall,
  checkedMutation,
} from "@/lib/database/mutation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import {
  validationErrorMessage,
  type ActionResult,
} from "@/lib/action-result";
import { syncMemberMentions } from "@/lib/members/mentions";
import { blogMentionValues } from "@/lib/members/mention-values";
import {
  normalizeArticleHtml,
  normalizeArticleJson,
} from "@/lib/blog/content";
import {
  removeManagedImageIfUnused,
  uploadManagedImage,
  type ManagedImageAsset,
} from "@/lib/assets/managed-images";

const schema = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(160),
  excerpt: z.string().trim().max(300),
  category: z.string().trim().max(40),
  tags: z.string().trim().max(200),
  content_html: z.string().max(300000),
  content_json: z.string().max(600000),
  status: z.enum(["draft", "published", "archived"]),
});

type Sb = SupabaseClient<Database>;

async function isBlogCoverReferenced(sb: Sb, url: string): Promise<boolean> {
  const { data, error } = await sb
    .from("blog_posts")
    .select("id")
    .eq("cover_image_url", url)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

async function removeUploadedCoverIfUnused(
  sb: Sb,
  cover: ManagedImageAsset | undefined,
) {
  if (!cover) return;
  await removeManagedImageIfUnused(cover, (url) =>
    isBlogCoverReferenced(sb, url),
  );
}

/** Cari slug unik dari judul (tambahkan -2, -3, … bila bentrok). */
async function uniqueSlug(sb: Sb, base: string, excludeId: string | null) {
  let slug = base;
  let n = 1;
  // Batasi iterasi agar aman.
  for (let i = 0; i < 50; i++) {
    const result = await checkedDatabaseCall(
      "blog.slug",
      "Gagal memeriksa URL artikel.",
      sb.from("blog_posts").select("id").eq("slug", slug).maybeSingle(),
    );
    if (!result.ok) return result;
    if (!result.data || result.data.id === excludeId) {
      return { ok: true as const, data: slug };
    }
    n += 1;
    slug = `${base}-${n}`;
  }
  return { ok: true as const, data: `${base}-${Date.now()}` };
}

function revalidateBlog() {
  revalidatePath("/profil/blog");
  revalidatePath("/profil");
  revalidatePath("/blog");
}

export async function savePost(
  formData: FormData,
): Promise<ActionResult & { id?: string }> {
  const admin = await requireFeature("blog");
  const parsed = schema.safeParse({
    title: formData.get("title") ?? "",
    excerpt: formData.get("excerpt") ?? "",
    category: formData.get("category") ?? "",
    tags: formData.get("tags") ?? "",
    content_html: formData.get("content_html") ?? "",
    content_json: formData.get("content_json") ?? "",
    status: formData.get("status") ?? "draft",
  });
  if (!parsed.success) {
    return { error: validationErrorMessage(parsed) };
  }
  const d = parsed.data;
  const sb = createAdminSupabase();
  const id = formData.get("id")?.toString() || null;

  let contentJson: unknown = null;
  try {
    contentJson = d.content_json
      ? normalizeArticleJson(JSON.parse(d.content_json))
      : null;
  } catch {
    return {
      error:
        "Konten editor tidak valid. Muat ulang halaman agar isi artikel tidak rusak.",
    };
  }

  const current = id
    ? await checkedMutation(
        "blog.load-update",
        "Gagal membaca artikel sebelum diperbarui.",
        sb
          .from("blog_posts")
          .select(
            "id, slug, published_at, author_name, cover_image_url",
          )
          .eq("id", id)
          .maybeSingle(),
      )
    : null;
  if (current && !current.ok) return { error: current.error };

  const slugResult = await uniqueSlug(sb, slugify(d.title) || "artikel", id);
  if (!slugResult.ok) return { error: slugResult.error };
  const slug = slugResult.data;

  // published_at hanya di-set saat pertama kali terbit.
  const publishedAt =
    d.status === "published"
      ? (current?.data.published_at ?? new Date().toISOString())
      : undefined;

  const tags = d.tags
    ? d.tags.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean)
    : [];

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

  const payload = {
    title: d.title,
    slug,
    excerpt: d.excerpt || null,
    category: d.category || null,
    tags: tags.length ? tags : null,
    content_html: normalizeArticleHtml(d.content_html),
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

  if (id) {
    const updateQuery = sb
      .from("blog_posts")
      .update(payload)
      .eq("id", id);
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
        notFoundMessage:
          "Artikel berubah di sesi lain. Muat ulang sebelum menyimpan kembali.",
      },
    );
    if (!saved.ok) {
      await removeUploadedCoverIfUnused(sb, uploadedCover);
      return { error: saved.error };
    }
    if (
      coverChanged &&
      current?.data.cover_image_url &&
      current.data.cover_image_url !== uploadedCover?.url
    ) {
      await removeManagedImageIfUnused(
        { kind: "blog-cover", url: current.data.cover_image_url },
        (url) => isBlogCoverReferenced(sb, url),
      );
    }
    await syncMemberMentions(
      { blogPostId: id },
      blogMentionValues({
        title: d.title,
        excerpt: d.excerpt,
        category: d.category,
        tags,
        author_name: current?.data.author_name ?? null,
        content_html: d.content_html,
      }),
    );
    revalidateBlog();
    if (current?.data.slug && current.data.slug !== slug) {
      revalidatePath(`/blog/${current.data.slug}`);
    }
    revalidatePath(`/blog/${slug}`);
    return { id };
  }

  const saved = await checkedMutation(
    "blog.create",
    "Gagal membuat artikel.",
    sb.from("blog_posts").insert(payload).select("id").maybeSingle(),
    { duplicateMessage: "URL artikel sudah dipakai. Coba judul lain." },
  );
  if (!saved.ok) {
    await removeUploadedCoverIfUnused(sb, uploadedCover);
    return { error: saved.error };
  }
  await syncMemberMentions(
    { blogPostId: saved.data.id },
    blogMentionValues({
      title: d.title,
      excerpt: d.excerpt,
      category: d.category,
      tags,
      author_name: admin.name,
      content_html: d.content_html,
    }),
  );
  revalidateBlog();
  revalidatePath(`/blog/${slug}`);
  return { id: saved.data.id };
}

export async function setPostStatus(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult> {
  await requireFeature("blog");
  const sb = createAdminSupabase();
  const current = await checkedMutation(
    "blog.load-status",
    "Gagal membaca status artikel.",
    sb
      .from("blog_posts")
      .select("id, slug, published_at")
      .eq("id", id)
      .maybeSingle(),
  );
  if (!current.ok) return { error: current.error };

  const patch: { status: typeof status; published_at?: string } = { status };
  if (status === "published" && !current.data.published_at) {
    patch.published_at = new Date().toISOString();
  }
  const saved = await checkedMutation(
    "blog.status",
    "Gagal mengubah status artikel.",
    sb
      .from("blog_posts")
      .update(patch)
      .eq("id", id)
      .select("id")
      .maybeSingle(),
  );
  if (!saved.ok) return { error: saved.error };
  revalidateBlog();
  revalidatePath(`/blog/${current.data.slug}`);
  return {};
}

export async function deletePost(id: string): Promise<ActionResult> {
  await requireFeature("blog");
  const sb = createAdminSupabase();
  const deleted = await checkedMutation(
    "blog.delete",
    "Gagal menghapus artikel.",
    sb
      .from("blog_posts")
      .delete()
      .eq("id", id)
      .select("id, slug, cover_image_url")
      .maybeSingle(),
  );
  if (!deleted.ok) return { error: deleted.error };
  if (deleted.data.cover_image_url) {
    await removeManagedImageIfUnused(
      { kind: "blog-cover", url: deleted.data.cover_image_url },
      (url) => isBlogCoverReferenced(sb, url),
    );
  }
  revalidateBlog();
  revalidatePath(`/blog/${deleted.data.slug}`);
  return {};
}
