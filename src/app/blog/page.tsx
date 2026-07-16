import type { Metadata } from "next";
import Image from "next/image";
import { Newspaper } from "lucide-react";
import { getSettings, getPublishedPosts } from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { PostRow } from "@/components/public/post-row";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { readingTime } from "@/lib/utils/reading-time";
import { timeAgo } from "@/lib/utils/time";
import { MotionLink } from "@/components/motion";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { getPhotoDestinationFrame } from "@/lib/media-editor/profiles";

const BLOG_COVER_FRAME = getPhotoDestinationFrame("blog-cover");

export const revalidate = 60;
export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), PUBLIC_PAGE_SEO.blog);
}

export default async function BlogListPage() {
  const [settings, posts] = await Promise.all([
    getSettings(),
    getPublishedPosts(),
  ]);
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <PageShell>
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold">Blog</h1>
        <p className="text-muted text-sm">
          Cerita dan kabar terbaru dari {settings.site_name}
        </p>
      </div>

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
              className="block"
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
                  priority
                  sizes="(max-width: 672px) 100vw, 672px"
                  className="motion-media-image"
                  style={{ objectFit: BLOG_COVER_FRAME.objectFit }}
                />
              ) : (
                <div className="liquid-gradient absolute inset-0" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
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
                  {featured.published_at && ` · ${timeAgo(featured.published_at)}`} ·{" "}
                  {readingTime(featured.content_html)} mnt baca
                </p>
              </div>
              </div>
            </MotionLink>
          )}

          <div className="space-y-3">
            {rest.map((p) => (
              <PostRow key={p.id} post={p} />
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
