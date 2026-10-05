import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAlbumForMedia,
  getApprovedMedia,
  getComments,
  getMediaById,
  getMediaSlides,
  getSettings,
} from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { ShareButton, SaveButton } from "@/components/public/share-save";
import { PinComments } from "@/components/public/pin-comments";
import { MediaCard } from "@/components/public/media-card";
import { PinMedia } from "@/components/public/pin-media";
import { Avatar } from "@/components/ui/avatar";
import { buttonClass } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Masonry } from "@/components/ui/masonry";
import { RelativeTime } from "@/components/ui/relative-time";
import { MotionLink, listReveal } from "@/components/motion";
import {
  MEDIA_ASPECT_LIMITS,
  mediaDisplayAspectRatio,
} from "@/lib/media/display";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata, plainText } from "@/lib/seo";
import {
  breadcrumbStructuredData,
  mediaStructuredData,
} from "@/lib/seo/structured-data";

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
  const title = media?.title || plainText(media?.caption, 70) || "Media";
  return buildPageMetadata(settings, {
    title,
    description:
      plainText(media?.caption, 170) ||
      `Dokumentasi foto dan video ${settings.site_name}.`,
    path: `/pin/${id}`,
    image: media?.thumbnail_url || (media?.type === "photo" ? media.url : null),
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
  const [{ comments, total: commentTotal }, recentMedia, album, slides] = await Promise.all([
    getComments(media.id),
    getApprovedMedia({ limit: 30 }),
    getAlbumForMedia(media.id),
    getMediaSlides(media),
  ]);
  const mediaSchema = mediaStructuredData(settings, media);
  const related = pickRelatedMedia(recentMedia, media.id, media.category);

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
        backHref: "/galeri",
        right: (
          <>
            <ShareButton title={media.title ?? "Pin"} />
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
            {
              name: media.title || "Media",
              path: `/pin/${media.id}`,
            },
          ]),
          ...(mediaSchema ? [mediaSchema] : []),
        ]}
      />
      {/* Desktop: media lengket di kiri, detail + komentar di kanan (pola pin
          Pinterest) alih-alih satu kolom sempit yang memaksa gulir panjang. */}
      <div className="mx-auto max-w-lg lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-8">
        <PinMedia
          mediaId={media.id}
          slides={slides}
          label={media.title || media.caption || "Media"}
          aspectRatio={ratio}
          className="rounded-ios-lg lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)]"
          style={{ viewTransitionName: `pin-${media.id}` }}
        />

        <div className="min-w-0">
          <div className="mt-4 flex items-center justify-between gap-3 lg:mt-0">
            <div className="flex items-center gap-2.5">
              <Avatar name={media.uploader_name || "Anonim"} size={40} />
              <div>
                <p className="text-sm font-semibold">{media.uploader_name || "Anonim"}</p>
                <RelativeTime iso={media.created_at} className="text-muted block text-xs" />
              </div>
            </div>
            {media.category && <Chip variant="softPrimary">{media.category}</Chip>}
          </div>

          {album && (
            <MotionLink
              href={`/album/${album.slug}`}
              prefetch={false}
              className={buttonClass({
                variant: "secondary",
                size: "sm",
                className: "mt-3 max-w-full gap-1.5",
              })}
            >
              <span className="text-muted">Album</span>
              <span className="truncate">{album.title}</span>
            </MotionLink>
          )}

          {media.title && (
            <h1 className="font-display mt-4 text-title1 font-bold text-balance">
              {media.title}
            </h1>
          )}
          {media.caption && (
            <p className="text-muted mt-2 text-subhead leading-relaxed">{media.caption}</p>
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
        <section aria-label="Pin lainnya" className="mx-auto mt-8 w-full max-w-5xl">
          <h2 className="font-display mb-3 text-title2 font-bold">Pin Lainnya</h2>
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
