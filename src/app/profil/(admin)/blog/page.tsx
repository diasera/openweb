import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Newspaper, Pencil, Plus } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import {
  getAdminPosts,
  getPostStatusCounts,
  type BlogFilter,
} from "@/lib/admin/blog";
import { isOneOf } from "@/lib/admin/guard";
import { adminBlogEditorHref, adminFeatureHref } from "@/lib/constants";
import { buildAdminPageMetadata } from "@/lib/seo";
import type { PostStatus } from "@/lib/types/database";
import { parsePageParam } from "@/lib/utils/url";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RelativeTime } from "@/components/ui/relative-time";
import { Pagination } from "@/components/public/pagination";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminTabs } from "@/components/admin/admin-tabs";
import {
  AdminList,
  AdminRow,
  LeadingIcon,
  StatusBadge,
  type BadgeTone,
} from "@/components/admin/admin-list";
import { DeleteAction, IconLink } from "@/components/admin/admin-actions";
import { PostStatusAction } from "@/components/admin/blog/post-status-action";
import { deletePost } from "./actions";

export const metadata = buildAdminPageMetadata("Blog");

const BASE_PATH = adminFeatureHref("blog");
const FILTERS = ["all", "published", "draft", "archived"] as const satisfies readonly BlogFilter[];
const STATUS: Record<PostStatus, { label: string; tone: BadgeTone }> = {
  published: { label: "Terbit", tone: "success" },
  draft: { label: "Draf", tone: "neutral" },
  archived: { label: "Arsip", tone: "outline" },
};

function NewPostLink({ className }: { className?: string }) {
  return (
    <Link href={adminBlogEditorHref()} className={buttonClass({ className })}>
      <Plus className="size-4" aria-hidden="true" /> Tulis artikel
    </Link>
  );
}

export default async function BlogAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireFeature("blog");
  const { status, page } = await searchParams;
  const filter: BlogFilter = isOneOf(status, FILTERS) ? status : "all";
  const [result, counts] = await Promise.all([
    getAdminPosts(filter, parsePageParam(page)),
    getPostStatusCounts(),
  ]);

  return (
    <AdminPage
      feature="blog"
      title="Blog"
      description="Tulis, terbitkan, dan arsipkan artikel. Artikel terbit langsung masuk sitemap dan feed RSS."
      actions={<NewPostLink className="motion-sheen relative overflow-hidden" />}
      toolbar={
        <AdminTabs
          basePath={BASE_PATH}
          active={filter}
          items={[
            { label: "Semua", value: "all", count: counts.all },
            { label: "Terbit", value: "published", count: counts.published },
            { label: "Draf", value: "draft", count: counts.draft },
            { label: "Arsip", value: "archived", count: counts.archived },
          ]}
        />
      }
    >
      {result.rows.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="size-8" />}
          title="Belum ada artikel"
          description={
            filter === "all"
              ? "Mulai tulis artikel pertama untuk website."
              : "Tidak ada artikel pada filter ini."
          }
          action={filter === "all" ? <NewPostLink /> : undefined}
        />
      ) : (
        <AdminList label="Artikel">
          {result.rows.map((post, index) => (
            <AdminRow
              key={post.id}
              index={index}
              leading={
                post.cover_image_url ? (
                  <span className="bg-surface-2 relative block h-11 w-16 overflow-hidden rounded-xl">
                    <Image src={post.cover_image_url} alt="" fill sizes="64px" className="object-cover" />
                  </span>
                ) : (
                  <LeadingIcon icon={Newspaper} wide className="bg-tone-pink/12 text-tone-pink-text" />
                )
              }
              title={post.title}
              badges={
                <>
                  <StatusBadge tone={STATUS[post.status].tone}>{STATUS[post.status].label}</StatusBadge>
                  {post.category && <StatusBadge>{post.category}</StatusBadge>}
                </>
              }
              meta={
                <>
                  Diperbarui <RelativeTime iso={post.updated_at} />
                  {post.author_name && ` · ${post.author_name}`}
                  {post.views > 0 && ` · ${post.views}× dibaca`}
                </>
              }
              actions={
                <>
                  {post.status === "published" && (
                    <IconLink
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      label="Buka artikel"
                      icon={<ExternalLink />}
                    />
                  )}
                  <PostStatusAction id={post.id} status={post.status} />
                  <IconLink href={adminBlogEditorHref(post.id)} label="Edit artikel" icon={<Pencil />} />
                  <DeleteAction
                    action={deletePost}
                    id={post.id}
                    title={`Hapus "${post.title}"?`}
                    message="Artikel, cover, dan gambar di dalamnya dihapus permanen."
                    successMessage="Artikel dihapus"
                  />
                </>
              }
            />
          ))}
        </AdminList>
      )}
      <Pagination
        basePath={BASE_PATH}
        current={result.page}
        total={result.totalPages}
        query={{ status: filter === "all" ? undefined : filter }}
      />
    </AdminPage>
  );
}
