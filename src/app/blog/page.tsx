import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowUpRight, Newspaper, X } from "lucide-react";
import {
  getPublishedPostCategories,
  getPublishedPostCount,
  getPublishedPosts,
  getSettings,
} from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { FilterChips } from "@/components/public/filter-chips";
import { PostRow } from "@/components/public/post-row";
import { Pagination } from "@/components/public/pagination";
import { Avatar } from "@/components/ui/avatar";
import { cardClass } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RelativeTime } from "@/components/ui/relative-time";
import { MotionLink, SharedMorph, listReveal } from "@/components/motion";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";
import {
  buildQueryHref,
  normalizeQueryFilter,
  parsePageParam,
} from "@/lib/utils/url";
import { getPhotoDestinationFrame } from "@/lib/media-editor/profiles";

const BLOG_COVER_FRAME = getPhotoDestinationFrame("blog-cover");
const PAGE_SIZE = 10;

export const revalidate = 60;
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return buildPageMetadata(settings, {
    ...PUBLIC_PAGE_SEO.blog,
    rssFeed: { url: "/feed.xml", title: `Blog ${settings.site_name}` },
  });
}

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; tag?: string }>;
}) {
  const [{ page: pageParam, category: categoryParam, tag: tagParam }, settings] =
    await Promise.all([searchParams, getSettings()]);
  const page = parsePageParam(pageParam);
  const category = normalizeQueryFilter(categoryParam);
  const tag = normalizeQueryFilter(tagParam);
  const filter = { category, tag };

  const [posts, total, categories] = await Promise.all([
    getPublishedPosts(PAGE_SIZE, (page - 1) * PAGE_SIZE, filter),
    getPublishedPostCount(filter),
    getPublishedPostCategories(),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (page > totalPages && totalPages > 0) notFound();

  const isFiltered = Boolean(category || tag);
  const featured = page === 1 && !isFiltered ? posts[0] : undefined;
  const rest = featured ? posts.slice(1) : posts;

  return (
    <PageShell>
      <JsonLd
        data={breadcrumbStructuredData(settings, [
          { name: "Beranda", path: "/" },
          { name: "Blog", path: "/blog" },
        ])}
      />
      <PageHeader
        size="large"
        eyebrow="Editorial"
        title="Blog"
        description={`Cerita, panduan, dan kabar terbaru dari ${settings.site_name}`}
      />

      <div className="mb-5 space-y-2">
        <FilterChips
          basePath="/blog"
          paramName="category"
          options={categories}
          activeValue={category}
          preserveQuery={{ tag }}
        />
        {tag && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted">Tag aktif:</span>
            <MotionLink
              href={buildQueryHref("/blog", { category })}
              prefetch={false}
              aria-label={`Hapus filter tag ${tag}`}
            >
              <Chip variant="softPrimary" className="motion-pressable">
                #{tag}
                <X className="size-3" aria-hidden="true" />
              </Chip>
            </MotionLink>
          </div>
        )}
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="h-8 w-8" />}
          title={isFiltered ? "Tidak ada artikel yang cocok" : "Belum ada artikel"}
          description={
            isFiltered
              ? "Coba pilih kategori lain atau reset filter tag."
              : "Artikel yang diterbitkan admin akan tampil di sini."
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Hero Majalah Split 2-Kolom di desktop untuk artikel terbaru */}
          {featured && (
            <MotionLink
              href={`/blog/${featured.slug}`}
              data-spotlight
              className={cardClass(
                "interactive",
                "animate-rise group grid overflow-hidden rounded-[1.75rem] lg:grid-cols-[1.25fr_1fr]",
              )}
            >
              <SharedMorph
                name={`post-cover-${featured.slug}`}
                enabled={Boolean(featured.cover_image_url)}
              >
                <div className="bg-surface-2 relative aspect-[16/10] w-full overflow-hidden lg:aspect-auto lg:min-h-[20rem]">
                  {featured.cover_image_url ? (
                    <Image
                      src={featured.cover_image_url}
                      alt={featured.title}
                      fill
                      preload
                      sizes="(max-width: 1023px) 100vw, 60vw"
                      className="motion-media-image"
                      style={{ objectFit: BLOG_COVER_FRAME.objectFit }}
                    />
                  ) : (
                    <div className="liquid-gradient grain absolute inset-0" />
                  )}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-black/15"
                  />
                  <div className="absolute left-4 top-4">
                    <span className="media-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption1 font-semibold">
                      <span
                        className="bg-primary size-1.75 rounded-full"
                        aria-hidden="true"
                      />
                      Sorotan
                    </span>
                  </div>
                </div>
              </SharedMorph>

              <div className="bg-linear-to-br from-surface to-surface-2/35 flex flex-col justify-between p-5 sm:p-7">
                <div>
                  <p className="text-primary-readable text-caption1 font-semibold uppercase tracking-[0.14em]">
                    {featured.category || "Artikel Terbaru"}
                  </p>
                  <h2 className="font-display group-hover:text-primary-readable mt-2 text-title1 font-extrabold leading-tight tracking-tight text-balance transition-colors sm:text-large-title">
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p className="text-muted mt-3 line-clamp-3 text-subhead leading-relaxed">
                      {featured.excerpt}
                    </p>
                  )}
                </div>

                <div className="border-border/60 mt-6 flex items-center justify-between gap-3 border-t pt-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={featured.author_name || "Redaksi"} size={34} />
                    <div className="min-w-0 text-xs leading-snug">
                      <p className="truncate font-semibold">
                        {featured.author_name || "Redaksi"}
                      </p>
                      <p className="text-muted truncate">
                        {featured.published_at && (
                          <>
                            <RelativeTime iso={featured.published_at} /> ·{" "}
                          </>
                        )}
                        {featured.reading_minutes} menit baca
                      </p>
                    </div>
                  </div>
                  <span className="text-primary-readable inline-flex shrink-0 items-center gap-1 text-xs font-semibold">
                    Baca
                    <ArrowUpRight
                      className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </div>
            </MotionLink>
          )}

          {/* Grid Majalah 2–3 Kolom */}
          {rest.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p, index) => (
                <div key={p.id} {...listReveal(index + 1)} className="h-full">
                  <PostRow post={p} variant="card" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Pagination
        basePath="/blog"
        current={page}
        total={totalPages}
        query={{ category, tag }}
      />
    </PageShell>
  );
}
