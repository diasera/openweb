import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getAlbumBySlug,
  getApprovedMedia,
  getApprovedMediaCount,
  getEventById,
  getSettings,
} from "@/lib/data";
import { buildPageMetadata } from "@/lib/seo";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";
import { eventPagePath } from "@/lib/agenda/calendar";
import { formatEventSchedule } from "@/lib/utils/time";
import { parsePageParam } from "@/lib/utils/url";
import { PageShell } from "@/components/public/page-shell";
import { AlbumDetailBrowser } from "@/components/public/album-detail-browser";
import { EventStatusBadge } from "@/components/public/event-countdown";
import { Pagination } from "@/components/public/pagination";
import { ShareButton } from "@/components/public/share-save";
import { PageHeader } from "@/components/ui/page-header";
import { MotionLink } from "@/components/motion";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 60;

const PAGE_SIZE = 24;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [album, settings] = await Promise.all([
    getAlbumBySlug(slug),
    getSettings(),
  ]);
  if (!album) {
    return buildPageMetadata(settings, {
      title: "Album",
      description: "Album tidak ditemukan.",
      path: "/album",
      noIndex: true,
    });
  }
  return buildPageMetadata(settings, {
    title: album.title,
    description:
      album.description || `Album ${album.title} dari ${settings.site_name}.`,
    path: `/album/${album.slug}`,
  });
}

export default async function AlbumPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ slug }, { page: pageParam }] = await Promise.all([
    params,
    searchParams,
  ]);
  const album = await getAlbumBySlug(slug);
  if (!album) notFound();
  if (album.slug !== slug) permanentRedirect(`/album/${album.slug}`);

  const page = parsePageParam(pageParam);
  const [settings, media, total, event] = await Promise.all([
    getSettings(),
    getApprovedMedia({
      albumId: album.id,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    getApprovedMediaCount(album.id),
    album.event_id ? getEventById(album.event_id) : Promise.resolve(null),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (page > totalPages && totalPages > 0) notFound();

  return (
    <PageShell
      header={{
        variant: "sub",
        title: album.title,
        backHref: "/album",
        right: <ShareButton title={`Album ${album.title}`} />,
      }}
    >
      <JsonLd
        data={breadcrumbStructuredData(settings, [
          { name: "Beranda", path: "/" },
          { name: "Album", path: "/album" },
          { name: album.title, path: `/album/${album.slug}` },
        ])}
      />
      <PageHeader
        size="large"
        eyebrow="Album Dokumentasi"
        title={album.title}
        description={
          <>
            {album.description && <span className="block">{album.description}</span>}
            <span className="mt-1.5 inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span className="tabular-nums">{total} media</span>
              {event && (
                <>
                  <span aria-hidden="true">·</span>
                  <MotionLink
                    href={eventPagePath(event.id)}
                    className="text-primary-readable font-semibold hover:underline"
                  >
                    {event.title} · {formatEventSchedule(event.starts_at)}
                  </MotionLink>
                </>
              )}
            </span>
          </>
        }
        action={event ? <EventStatusBadge event={event} /> : undefined}
      />

      <AlbumDetailBrowser media={media} albumTitle={album.title} />
      <Pagination
        basePath={`/album/${album.slug}`}
        current={page}
        total={totalPages}
      />
    </PageShell>
  );
}
