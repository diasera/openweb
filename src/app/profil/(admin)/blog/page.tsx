import Link from "next/link";
import { Newspaper, Pencil, Plus } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import { getAdminPosts, type BlogFilter } from "@/lib/admin/blog";
import { buildAdminPageMetadata } from "@/lib/seo";
import { timeAgo } from "@/lib/utils/time";
import { PageHeader } from "@/components/admin/page-header";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DeleteButton } from "@/components/admin/confirmed-action-button";
import { PostStatusButton } from "@/components/admin/post-actions";
import { deletePost } from "./actions";

export const metadata = buildAdminPageMetadata("Blog");

const FILTERS: BlogFilter[] = ["all", "published", "draft", "archived"];

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireFeature("blog");
  const { status } = await searchParams;
  const filter: BlogFilter = FILTERS.includes(status as BlogFilter)
    ? (status as BlogFilter)
    : "all";
  const posts = await getAdminPosts(filter);

  return (
    <div>
      <PageHeader
        title="Blog"
        description="Tulis, edit, terbitkan, atau arsipkan artikel."
        action={
          <Link href="/profil/blog/new" className={buttonClass()}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Tulis artikel
          </Link>
        }
      />

      <FilterTabs
        basePath="/profil/blog"
        active={filter}
        items={[
          { label: "Semua", value: "all" },
          { label: "Terbit", value: "published" },
          { label: "Draft", value: "draft" },
          { label: "Arsip", value: "archived" },
        ]}
      />

      {posts.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="h-8 w-8" />}
          title="Belum ada artikel"
          description="Mulai tulis artikel pertama untuk website."
          action={
            <Link href="/profil/blog/new" className={buttonClass()}>
              Tulis artikel
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <Card key={p.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold">{p.title}</p>
                  <Chip
                    variant={
                      p.status === "published"
                        ? "primary"
                        : p.status === "draft"
                          ? "soft"
                          : "outline"
                    }
                  >
                    {p.status}
                  </Chip>
                </div>
                <p className="text-muted truncate text-xs">
                  Diperbarui {timeAgo(p.updated_at)}
                </p>
              </div>
              <PostStatusButton id={p.id} status={p.status} />
              <Link
                href={`/profil/blog/${p.id}`}
                aria-label="Edit"
                title="Edit"
                className="text-muted hover:bg-surface-2 grid h-9 w-9 shrink-0 place-items-center rounded-lg"
              >
                <Pencil className="h-[18px] w-[18px]" />
              </Link>
              <DeleteButton
                action={deletePost}
                id={p.id}
                message={`Hapus artikel "${p.title}"?`}
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
