import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getMediaById, getComments, getSettings } from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { ShareButton, SaveButton } from "@/components/public/share-save";
import { CommentComposer } from "@/components/public/comment-composer";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
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
  const comments = await getComments(media.id);
  const mediaSchema = mediaStructuredData(settings, media);

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
          style={{ aspectRatio: ratio }}
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

        <div className="mt-6">
          <h2 className="font-display mb-3 font-bold">
            Komentar <span className="text-muted font-normal">{comments.length}</span>
          </h2>
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <Avatar name={c.author_name || "Anonim"} size={32} />
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">{c.author_name || "Anonim"}</span>{" "}
                    <span className="text-muted text-xs">{timeAgo(c.created_at)}</span>
                  </p>
                  <p className="text-sm">{c.content}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-muted text-sm">Belum ada komentar. Jadilah yang pertama!</p>
            )}
          </div>

          {media.allow_comments && (
            <div className="mt-4">
              <CommentComposer mediaId={media.id} />
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
