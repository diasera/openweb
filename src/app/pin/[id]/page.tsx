import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import {
  getAlbumForMedia,
  getApprovedMedia,
  getComments,
  getContentReactions,
  getMediaById,
  getMediaSlides,
  getSettings,
} from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { ShareButton, SaveButton } from "@/components/public/share-save";
import { PinComments } from "@/components/public/pin-comments";
import { MediaCard } from "@/components/public/media-card";
import { MentionedMembers } from "@/components/public/mentioned-members";
import { PinMedia } from "@/components/public/pin-media";
import { ReactionBar } from "@/components/public/reaction-bar";
import { StoryShareButton } from "@/components/public/story-share-button";
import { getMentionedMembersForMedia } from "@/lib/members/activity";
import { slidePreviewUrl } from "@/lib/media/slides";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { cardClass } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Masonry } from "@/components/ui/masonry";
import { RelativeTime } from "@/components/ui/relative-time";
import { SectionHeader } from "@/components/ui/section-header";
import { MotionLink, SharedMorph, listReveal } from "@/components/motion";
import {
  MEDIA_ASPECT_LIMITS,
  mediaDisplayAspectRatio,
} from "@/lib/media/display";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata, mediaTitle, plainText } from "@/lib/seo";
import {
  breadcrumbStructuredData,
  mediaStructuredData,
} from "@/lib/seo/structured-data";
import { formatSiteDate } from "@/lib/utils/time";
import { buildQueryHref } from "@/lib/utils/url";

export const revalidate = 30;

const RELATED_LIMIT = 6;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [media, settings] = await Promise.all([
    getMediaById(id),
    getSettings(),
  ]);
  const title = media ? mediaTitle(media, settings) : "Pin tidak ditemukan";
  return buildPageMetadata(settings, {
    title,
    description:
      plainText(media?.caption, 170) ||
      (media
        ? `${title} — dokumentasi ${media.type === "video" ? "video" : "foto"} ${settings.site_name}.`
        : `Dokumentasi foto dan video ${settings.site_name}.`),
    path: `/pin/${id}`,
    image: media?.type === "photo" ? media.url : null,
    noIndex: !media,
  });
}

/** Pin lain: utamakan kategori sama, sisanya diisi yang terbaru. */
function pickRelatedMedia(
  pool: Awaited<ReturnType<typeof getApprovedMedia>>,
  currentId: string,
  category: string | null,
) {
  const others = pool.filter((item) => item.id !== currentId);
  const sameCategory = others.filter((item) => item.category === category);
  const fallback = others.filter((item) => item.category !== category);
  return [...sameCategory, ...fallback].slice(0, RELATED_LIMIT);
}

export default async function PinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [media, settings] = await Promise.all([
    getMediaById(id),
    getSettings(),
  ]);
  if (!media) notFound();
  const [
    { comments, total: commentTotal },
    recentMedia,
    album,
    slides,
    mentionedMembers,
    reactions,
  ] = await Promise.all([
    getComments(media.id),
    getApprovedMedia({ limit: 30 }),
    getAlbumForMedia(media.id),
    getMediaSlides(media),
    getMentionedMembersForMedia(media),
    getContentReactions("media", media.id),
  ]);

  const albumPeers = album
    ? await getApprovedMedia({
        albumId: album.id,
        limit: 120,
        slideCounts: false,
      })
    : [];
  const albumIndex = albumPeers.findIndex((item) => item.id === media.id);
  const prevPin = albumIndex > 0 ? albumPeers[albumIndex - 1] ?? null : null;
  const nextPin =
    albumIndex >= 0 && albumIndex < albumPeers.length - 1
      ? albumPeers[albumIndex + 1] ?? null
      : null;

  const mediaSchema = mediaStructuredData(settings, media);
  const related = pickRelatedMedia(recentMedia, media.id, media.category);
  const title = mediaTitle(media, settings);
  const absoluteDate = formatSiteDate(media.created_at);

  const ratio = mediaDisplayAspectRatio(
    media.width,
    media.height,
    1,
    MEDIA_ASPECT_LIMITS.detail,
  );

  return (
    <PageShell
      header={{
        variant: "sub",
        title: "",
        backHref: album ? `/album/${album.slug}` : "/galeri",
        right: (
          <>
            <StoryShareButton
              variant="icon"
              spec={{
                kind: "pin",
                siteName: settings.site_name,
                title,
                caption: media.caption,
                uploader: media.uploader_name,
                dateLabel: absoluteDate,
                category: media.category,
                imageUrl: slidePreviewUrl(media),
                filename: `pin-${media.id.slice(0, 8)}`,
              }}
            />
            <ShareButton title={title} />
            <SaveButton kind="pin" itemId={media.id} pill />
          </>
        ),
      }}
    >
      <JsonLd
        data={[
          breadcrumbStructuredData(settings, [
            { name: "Beranda", path: "/" },
            { name: "Galeri", path: "/galeri" },
            { name: title, path: `/pin/${media.id}` },
          ]),
          ...(mediaSchema ? [mediaSchema] : []),
        ]}
      />
      {/* Desktop: media lengket di kiri, detail + komentar di kanan (pola pin
          Pinterest) alih-alih satu kolom sempit yang memaksa gulir panjang. */}
      <div className="mx-auto max-w-lg lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <SharedMorph name={`pin-${media.id}`}>
          <PinMedia
            mediaId={media.id}
            slides={slides}
            label={title}
            aspectRatio={ratio}
            className="rounded-ios-lg shadow-elevated ring-1 ring-inset ring-black/6 dark:ring-white/10 lg:sticky-below-island lg:max-h-[calc(100dvh-8rem)]"
          />
        </SharedMorph>

        <div className="mt-4 min-w-0 space-y-5 lg:mt-0">
          <div className={cardClass("elevated", "p-5 sm:p-6")}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Avatar name={media.uploader_name || "Anonim"} size={40} />
                <div>
                  <p className="text-sm font-semibold">
                    {media.uploader_name || "Anonim"}
                  </p>
                  <p className="text-muted flex flex-wrap items-center gap-x-1.5 text-xs">
                    <RelativeTime iso={media.created_at} />
                    <span aria-hidden="true">·</span>
                    <span>{absoluteDate}</span>
                  </p>
                </div>
              </div>
              {media.category && (
                <MotionLink
                  href={buildQueryHref("/galeri", { category: media.category })}
                  prefetch={false}
                >
                  <Chip variant="softPrimary" className="motion-pressable">
                    {media.category}
                  </Chip>
                </MotionLink>
              )}
            </div>

            {(album || media.url) && (
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                {album && (
                  <MotionLink
                    href={`/album/${album.slug}`}
                    prefetch={false}
                    className={buttonClass({
                      variant: "secondary",
                      size: "sm",
                      className: "max-w-full gap-1.5",
                    })}
                  >
                    <span className="text-muted">Album</span>
                    <span className="truncate">{album.title}</span>
                  </MotionLink>
                )}
                {media.url && (
                  <a
                    href={media.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass({
                      variant: "outline",
                      size: "sm",
                      className: "gap-1.5 text-xs",
                    })}
                  >
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                    Media asli
                  </a>
                )}
              </div>
            )}

            {/* Setiap pin punya h1: judul admin bila ada, selain itu judul
                turunan (jenis · kategori · tanggal) khusus pembaca layar/mesin pencari. */}
            <h1
              className={
                media.title
                  ? "font-display mt-4 text-title1 font-extrabold tracking-tight text-balance"
                  : "sr-only"
              }
            >
              {title}
            </h1>
            {media.caption && (
              <p className="text-muted mt-2 text-subhead leading-relaxed">
                {media.caption}
              </p>
            )}

            <ReactionBar
              kind="media"
              targetId={media.id}
              initialCounts={reactions.counts}
              available={reactions.available}
              demo={reactions.demo}
              className="border-border/60 mt-4 border-t pt-4"
            />

            <MentionedMembers members={mentionedMembers} settings={settings} />
          </div>

          {(prevPin || nextPin) && (
            <nav
              aria-label="Navigasi pin dalam album"
              className="grid grid-cols-2 gap-2.5"
            >
              {prevPin ? (
                <MotionLink
                  href={`/pin/${prevPin.id}`}
                  className={cardClass(
                    "interactive",
                    "flex items-center gap-2 p-2.5 text-left",
                  )}
                >
                  <ChevronLeft
                    className="text-muted size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="text-muted block text-[0.68rem] font-semibold">
                      Sebelumnya
                    </span>
                    <span className="block truncate text-xs font-semibold">
                      {mediaTitle(prevPin, settings)}
                    </span>
                  </span>
                </MotionLink>
              ) : (
                <span />
              )}
              {nextPin ? (
                <MotionLink
                  href={`/pin/${nextPin.id}`}
                  className={cardClass(
                    "interactive",
                    "flex items-center justify-end gap-2 p-2.5 text-right",
                  )}
                >
                  <span className="min-w-0">
                    <span className="text-muted block text-[0.68rem] font-semibold">
                      Berikutnya
                    </span>
                    <span className="block truncate text-xs font-semibold">
                      {mediaTitle(nextPin, settings)}
                    </span>
                  </span>
                  <ChevronRight
                    className="text-muted size-4 shrink-0"
                    aria-hidden="true"
                  />
                </MotionLink>
              ) : (
                <span />
              )}
            </nav>
          )}

          <PinComments
            mediaId={media.id}
            allowComments={media.allow_comments}
            initialComments={comments}
            totalCount={commentTotal}
          />
        </div>
      </div>

      {related.length > 0 && (
        <section
          aria-labelledby="related-pins"
          className="mx-auto mt-10 w-full max-w-5xl"
        >
          <SectionHeader
            id="related-pins"
            eyebrow="Eksplorasi"
            title="Pin lainnya"
          />
          {/* Masonry (bukan grid baris) agar rasio asli tidak meninggalkan celah. */}
          <Masonry>
            {related.map((item, index) => (
              <div key={item.id} {...listReveal(index)}>
                <MediaCard media={item} />
              </div>
            ))}
          </Masonry>
        </section>
      )}
    </PageShell>
  );
}
