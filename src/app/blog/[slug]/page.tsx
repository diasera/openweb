import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  getPostBySlug,
  getPublishedPosts,
  getSettings,
} from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { PostRow } from "@/components/public/post-row";
import { ShareButton, SaveButton } from "@/components/public/share-save";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { categoryColor } from "@/lib/categories";
import { readingTime } from "@/lib/utils/reading-time";
import { normalizeArticleHtml } from "@/lib/blog/content";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata, plainText } from "@/lib/seo";
import {
  articleStructuredData,
  breadcrumbStructuredData,
} from "@/lib/seo/structured-data";
import { getPhotoDestinationFrame } from "@/lib/media-editor/profiles";

const BLOG_COVER_FRAME = getPhotoDestinationFrame("blog-cover");

/** Artikel terkait: utamakan kategori sama, sisa diisi terbaru (maks 3). */
function pickRelatedPosts(
  posts: Awaited<ReturnType<typeof getPublishedPosts>>,
  currentSlug: string,
  category: string | null,
) {
  const others = posts.filter((post) => post.slug !== currentSlug);
  const sameCategory = others.filter((post) => post.category === category);
  const fallback = others.filter((post) => post.category !== category);
  return [...sameCategory, ...fallback].slice(0, 3);
}

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [post, settings] = await Promise.all([
    getPostBySlug(slug),
    getSettings(),
  ]);
  if (!post) {
    return buildPageMetadata(settings, {
      title: "Artikel tidak ditemukan",
      description: "Artikel yang diminta tidak tersedia.",
      path: `/blog/${slug}`,
      noIndex: true,
    });
  }
  const description =
    post.excerpt || plainText(post.content_html, 170) || post.title;
  return buildPageMetadata(settings, {
    title: post.title,
    description,
    path: `/blog/${post.slug}`,
    // Tanpa cover, kartu sosial artikel dirender otomatis oleh /api/og.
    image: post.cover_image_url ?? `/api/og/blog/${post.slug}`,
    type: "article",
    publishedTime: post.published_at,
    modifiedTime: post.updated_at,
    authors: [post.author_name || "Redaksi"],
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, settings, recentPosts] = await Promise.all([
    getPostBySlug(slug),
    getSettings(),
    getPublishedPosts(30),
  ]);
  if (!post) notFound();
  const related = pickRelatedPosts(recentPosts, post.slug, post.category);

  const dateStr = post.published_at
    ? new Date(post.published_at)
        .toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
        .toUpperCase()
    : "";

  return (
    <PageShell
      header={{
        variant: "sub",
        title: "",
        backHref: "/blog",
        right: (
          <>
            <ShareButton title={post.title} />
            <SaveButton id={`post-${post.id}`} />
          </>
        ),
      }}
    >
      <JsonLd
        data={[
          articleStructuredData(settings, post),
          breadcrumbStructuredData(settings, [
            { name: "Beranda", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
        ]}
      />
      <article className="mx-auto min-w-0 w-full max-w-2xl">
        {post.cover_image_url && (
          <div
            className="rounded-ios-lg bg-surface-2 relative mb-5 overflow-hidden"
            style={{ aspectRatio: BLOG_COVER_FRAME.aspectRatio }}
          >
            <Image
              src={post.cover_image_url}
              alt={post.title}
              fill
              priority
              loading="eager"
              sizes="(max-width: 672px) 100vw, 672px"
              style={{ objectFit: BLOG_COVER_FRAME.objectFit }}
            />
          </div>
        )}

        {(post.category || dateStr) && (
          <p
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: categoryColor(post.category) }}
          >
            {[post.category, dateStr].filter(Boolean).join(" · ")}
          </p>
        )}

        <h1 className="font-display mt-1.5 text-3xl font-bold leading-tight">
          {post.title}
        </h1>

        <div className="mt-4 flex items-center gap-3">
          <Avatar name={post.author_name || "Redaksi"} size={40} />
          <div>
            <p className="text-sm font-semibold">{post.author_name || "Redaksi"}</p>
            <p className="text-muted text-xs">{readingTime(post.content_html)} menit baca</p>
          </div>
        </div>

        <div
          className="article-content prose prose-sm sm:prose-base prose-headings:font-display prose-a:text-primary-readable mt-6 max-w-none"
          dangerouslySetInnerHTML={{ __html: normalizeArticleHtml(post.content_html) }}
        />

        {post.tags && post.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <Chip key={t} variant="soft">
                #{t}
              </Chip>
            ))}
          </div>
        )}
      </article>

      {related.length > 0 && (
        <section aria-label="Artikel terkait" className="mx-auto mt-8 w-full max-w-2xl">
          <h2 className="font-display mb-3 text-lg font-bold">Artikel Terkait</h2>
          <div className="space-y-3">
            {related.map((p) => (
              <PostRow key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
