import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getContentReactions,
  getPostBySlug,
  getPublishedPosts,
  getSettings,
} from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { ArticleContent, ArticleCover } from "@/components/public/article-content";
import { ArticleToc, ReadingProgressBar } from "@/components/public/article-toc";
import { MentionedMembers } from "@/components/public/mentioned-members";
import { PostRow } from "@/components/public/post-row";
import { ReactionBar } from "@/components/public/reaction-bar";
import { ShareButton, SaveButton } from "@/components/public/share-save";
import { getMentionedMembersForPost } from "@/lib/members/activity";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { SectionHeader } from "@/components/ui/section-header";
import { readingTime } from "@/lib/utils/reading-time";
import { formatSiteDate } from "@/lib/utils/time";
import { normalizeArticleHtml } from "@/lib/blog/content";
import { prepareArticleToc } from "@/lib/blog/toc";
import { JsonLd } from "@/components/seo/json-ld";
import { BLOG_OG_CARD_PATH, buildPageMetadata, plainText } from "@/lib/seo";
import {
  articleStructuredData,
  breadcrumbStructuredData,
} from "@/lib/seo/structured-data";
import { getPhotoDestinationFrame } from "@/lib/media-editor/profiles";
import { MotionLink, listReveal } from "@/components/motion";
import { buildQueryHref } from "@/lib/utils/url";

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
    image: post.cover_image_url ?? `${BLOG_OG_CARD_PATH}/${post.slug}`,
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
  // Slug lama (judul pernah diganti) dialihkan permanen ke URL kanonis.
  if (post.slug !== slug) permanentRedirect(`/blog/${post.slug}`);
  const [mentionedMembers, reactions] = await Promise.all([
    getMentionedMembersForPost(post),
    getContentReactions("blog", post.id),
  ]);
  const related = pickRelatedPosts(recentPosts, post.slug, post.category);
  const { html: preparedHtml, headings } = prepareArticleToc(
    normalizeArticleHtml(post.content_html),
  );

  // Zona situs, bukan zona server: artikel 00.30 WIB tidak tampil sebagai kemarin.
  const dateStr = post.published_at
    ? formatSiteDate(post.published_at).toUpperCase()
    : "";
  const hasToc = headings.length >= 2;
  const readMinutes = readingTime(post.content_html);

  return (
    <PageShell
      header={{
        variant: "sub",
        title: "",
        backHref: "/blog",
        right: (
          <>
            <ShareButton title={post.title} />
            <SaveButton kind="post" itemId={post.id} />
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
      <ReadingProgressBar />

      <article className="mx-auto w-full max-w-5xl min-w-0">
        {/* Masthead Editorial */}
        <header className="mx-auto max-w-3xl">
          {(post.category || dateStr) && (
            <div className="flex flex-wrap items-center gap-2 text-caption1 font-semibold uppercase tracking-[0.12em]">
              {post.category && (
                <MotionLink
                  href={buildQueryHref("/blog", { category: post.category })}
                  prefetch={false}
                >
                  <Chip variant="softPrimary" className="motion-pressable">
                    {post.category}
                  </Chip>
                </MotionLink>
              )}
              {dateStr && <span className="text-muted">{dateStr}</span>}
              <span className="text-muted" aria-hidden="true">·</span>
              <span className="text-muted tabular-nums">{readMinutes} menit baca</span>
            </div>
          )}

          <h1 className="font-display mt-3 text-title1 font-extrabold leading-tight tracking-tight text-balance sm:text-large-title lg:text-[2.75rem] lg:leading-[1.1]">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-muted mt-3 text-callout leading-relaxed text-pretty sm:text-title3 sm:leading-relaxed">
              {post.excerpt}
            </p>
          )}

          <div className="border-border/65 mt-5 flex items-center gap-3 border-y py-3.5">
            <Avatar name={post.author_name || "Redaksi"} size={40} />
            <div>
              <p className="text-sm font-semibold">{post.author_name || "Redaksi"}</p>
              <p className="text-muted text-xs">{readMinutes} menit baca</p>
            </div>
          </div>
        </header>

        {post.cover_image_url && (
          <div className="mx-auto mt-6 max-w-4xl">
            <ArticleCover
              slug={post.slug}
              title={post.title}
              src={post.cover_image_url}
              aspectRatio={BLOG_COVER_FRAME.aspectRatio}
              objectFit={BLOG_COVER_FRAME.objectFit}
            />
          </div>
        )}

        <div
          className={
            hasToc
              ? "mt-6 lg:grid lg:grid-cols-[minmax(0,42rem)_16rem] lg:items-start lg:justify-center lg:gap-10"
              : "mx-auto mt-6 max-w-2xl"
          }
        >
          <div className="min-w-0">
            {hasToc && (
              <div className="lg:hidden">
                <ArticleToc headings={headings} className="mt-0" />
              </div>
            )}

            <ArticleContent
              html={preparedHtml}
              title={post.title}
              className="mt-4 lg:mt-0"
            />

            {post.tags && post.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {post.tags.map((t) => (
                  <MotionLink
                    key={t}
                    href={buildQueryHref("/blog", { tag: t })}
                    prefetch={false}
                  >
                    <Chip
                      variant="soft"
                      className="motion-pressable transition-colors hover:text-foreground"
                    >
                      #{t}
                    </Chip>
                  </MotionLink>
                ))}
              </div>
            )}

            <ReactionBar
              kind="blog"
              targetId={post.id}
              initialCounts={reactions.counts}
              available={reactions.available}
              demo={reactions.demo}
              className="border-border/70 mt-6 border-t pt-5"
            />

            <MentionedMembers members={mentionedMembers} settings={settings} className="mt-6" />
          </div>

          {hasToc && (
            <aside className="hidden lg:block lg:sticky-below-island">
              <ArticleToc headings={headings} className="mt-0" />
            </aside>
          )}
        </div>
      </article>

      {related.length > 0 && (
        <section
          aria-labelledby="related-posts"
          className="mx-auto mt-12 w-full max-w-5xl"
        >
          <SectionHeader
            id="related-posts"
            eyebrow="Baca selanjutnya"
            title="Artikel terkait"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p, index) => (
              <div key={p.id} {...listReveal(index)} className="h-full">
                <PostRow post={p} variant="card" />
              </div>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
