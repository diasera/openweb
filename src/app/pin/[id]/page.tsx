import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getApprovedMedia, getComments, getMediaById, getSettings } from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { ShareButton, SaveButton } from "@/components/public/share-save";
import { PinComments } from "@/components/public/pin-comments";
import { MediaCard } from "@/components/public/media-card";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { staggerDelay } from "@/components/motion";
import {
  MEDIA_ASPECT_LIMITS,
  mediaDisplayAspectRatio,
} from "@/lib/media/display";
import { gradientCss } from "@/lib/utils/color";
import { timeAgo } from "@/lib/utils/time";
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
  const [comments, recentMedia] = await Promise.all([
    getComments(media.id),
    getApprovedMedia({ limit: 30 }),
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
            <SaveButton id={`pin-${media.id}`} pill />
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
      <div className="mx-auto max-w-lg">
        <div
          className="rounded-ios-lg bg-surface-2 relative w-full overflow-hidden"
          style={{ aspectRatio: ratio, viewTransitionName: `pin-${media.id}` }}
        >
          {media.type === "video" && media.url ? (
            <video
              poster={media.thumbnail_url ?? undefined}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
            >
              <source
                src={media.url}
                type={media.mime_type ?? undefined}
              />
              Browser ini belum dapat memutar codec video tersebut.
            </video>
          ) : media.url ? (
            <Image
              src={media.url}
              alt={media.title ?? "Media"}
              fill
              priority
              sizes="(max-width: 672px) 100vw, 512px"
              className="object-contain"
            />
          ) : (
            <div className="absolute inset-0" style={{ background: gradientCss(media.id) }} />
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={media.uploader_name || "Anonim"} size={40} />
            <div>
              <p className="text-sm font-semibold">{media.uploader_name || "Anonim"}</p>
              <p className="text-muted text-xs">{timeAgo(media.created_at)}</p>
            </div>
          </div>
          {media.category && <Chip variant="softPrimary">{media.category}</Chip>}
        </div>

        {media.title && (
          <h1 className="font-display mt-4 text-2xl font-bold leading-tight">
            {media.title}
          </h1>
        )}
        {media.caption && (
          <p className="text-muted mt-2 text-sm leading-relaxed">{media.caption}</p>
        )}

        <PinComments
          mediaId={media.id}
          allowComments={media.allow_comments}
          initialComments={comments}
        />
      </div>

      {related.length > 0 && (
        <section aria-label="Pin lainnya" className="mx-auto mt-8 w-full max-w-5xl">
          <h2 className="font-display mb-3 text-lg font-bold">
            Pin Lainnya
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {related.map((item, index) => (
              <div
                key={item.id}
                className="animate-rise"
                style={{ animationDelay: staggerDelay(index) }}
              >
                <MediaCard media={item} />
              </div>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
