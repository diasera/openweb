import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Newspaper } from "lucide-react";
import {
  getPublishedPostCount,
  getPublishedPosts,
  getSettings,
} from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { PostRow } from "@/components/public/post-row";
import { Pagination } from "@/components/public/pagination";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { readingTime } from "@/lib/utils/reading-time";
import { RelativeTime } from "@/components/ui/relative-time";
import { MotionLink, listReveal } from "@/components/motion";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";
import { parsePageParam } from "@/lib/utils/url";
import { getPhotoDestinationFrame } from "@/lib/media-editor/profiles";

const BLOG_COVER_FRAME = getPhotoDestinationFrame("blog-cover");
const PAGE_SIZE = 10;

export const revalidate = 60;
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  // Autodiscovery feed: pembaca RSS menemukan /feed.xml otomatis. Dulu
  // `alternates` ditimpa di sini sehingga canonical /blog ikut hilang.
  return buildPageMetadata(settings, {
    ...PUBLIC_PAGE_SEO.blog,
    rssFeed: { url: "/feed.xml", title: `Blog ${settings.site_name}` },
  });
}

export default async function BlogListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ page: pageParam }, settings] = await Promise.all([
    searchParams,
    getSettings(),
  ]);
  const page = parsePageParam(pageParam);
  const [posts, total] = await Promise.all([
    getPublishedPosts(PAGE_SIZE, (page - 1) * PAGE_SIZE),
    getPublishedPostCount(),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (page > totalPages && totalPages > 0) notFound();

  const featured = page === 1 ? posts[0] : undefined;
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
        title="Blog"
        description={`Cerita dan kabar terbaru dari ${settings.site_name}`}
      />

      {posts.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="h-8 w-8" />}
          title="Belum ada artikel"
          description="Artikel yang diterbitkan admin akan tampil di sini."
        />
      ) : (
        <div className="space-y-4">
          {featured && (
            <MotionLink
              href={`/blog/${featured.slug}`}
              className="animate-rise block"
            >
              <div
                className="motion-card rounded-ios-lg bg-surface-2 relative block overflow-hidden"
                style={{ aspectRatio: BLOG_COVER_FRAME.aspectRatio }}
              >
              {featured.cover_image_url ? (
                <Image
                  src={featured.cover_image_url}
                  alt={featured.title}
                  fill
                  preload
                  sizes="(max-width: 672px) 100vw, 672px"
                  className="motion-parallax"
                  style={{ objectFit: BLOG_COVER_FRAME.objectFit }}
                />
              ) : (
                <div className="liquid-gradient grain absolute inset-0" />
              )}
              <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-transparent" />
              {featured.category && (
                <div className="absolute left-4 top-4">
                  <Chip variant="glass">{featured.category}</Chip>
                </div>
              )}
              <div className="absolute inset-x-4 bottom-4 text-white">
                <h2 className="font-display text-xl font-bold leading-tight">
                  {featured.title}
                </h2>
                <p className="mt-1 text-xs text-white/80">
                  {featured.author_name || "Redaksi"}
                  {featured.published_at && (
                    <>
                      {" · "}
                      <RelativeTime iso={featured.published_at} />
                    </>
                  )}{" "}
                  · {readingTime(featured.content_html)} mnt baca
                </p>
              </div>
              </div>
            </MotionLink>
          )}

          <div className="space-y-3">
            {rest.map((p, index) => (
              <div key={p.id} {...listReveal(index + 1)}>
                <PostRow post={p} />
              </div>
            ))}
          </div>
        </div>
      )}

      <Pagination basePath="/blog" current={page} total={totalPages} />
    </PageShell>
  );
}
