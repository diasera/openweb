import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Images } from "lucide-react";
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
import { MediaCard } from "@/components/public/media-card";
import { Pagination } from "@/components/public/pagination";
import { Masonry } from "@/components/ui/masonry";
import { EmptyState } from "@/components/ui/empty-state";
import { MotionLink, listReveal } from "@/components/motion";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 60;

const PAGE_SIZE = 24;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [album, settings] = await Promise.all([getAlbumBySlug(slug), getSettings()]);
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
    description: album.description || `Album ${album.title} dari ${settings.site_name}.`,
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
  const [{ slug }, { page: pageParam }] = await Promise.all([params, searchParams]);
  const album = await getAlbumBySlug(slug);
  if (!album) notFound();
  if (album.slug !== slug) permanentRedirect(`/album/${album.slug}`);

  const page = parsePageParam(pageParam);
  const [settings, media, total, event] = await Promise.all([
    getSettings(),
    getApprovedMedia({ albumId: album.id, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    getApprovedMediaCount(album.id),
    album.event_id ? getEventById(album.event_id) : Promise.resolve(null),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (page > totalPages && totalPages > 0) notFound();

  return (
    <PageShell header={{ variant: "sub", title: album.title, backHref: "/album" }}>
      <JsonLd
        data={breadcrumbStructuredData(settings, [
          { name: "Beranda", path: "/" },
          { name: "Album", path: "/album" },
          { name: album.title, path: `/album/${album.slug}` },
        ])}
      />
      <div className="px-1 pb-4">
        <h1 className="font-display text-3xl font-bold">{album.title}</h1>
        {album.description && <p className="text-muted mt-1 text-sm">{album.description}</p>}
        <p className="text-muted mt-2 text-xs">
          {total} media
          {event && (
            <>
              {" · "}
              <MotionLink href={eventPagePath(event.id)} className="text-primary-readable font-semibold">
                {event.title} · {formatEventSchedule(event.starts_at)}
              </MotionLink>
            </>
          )}
        </p>
      </div>

      {media.length === 0 ? (
        <EmptyState
          icon={<Images className="h-8 w-8" />}
          title="Album masih kosong"
          description="Foto dan video acara ini akan tampil setelah disetujui admin."
        />
      ) : (
        <Masonry>
          {media.map((item, index) => (
            <div key={item.id} {...listReveal(index)}>
              <MediaCard media={item} showMeta />
            </div>
          ))}
        </Masonry>
      )}
      <Pagination basePath={`/album/${album.slug}`} current={page} total={totalPages} />
    </PageShell>
  );
}
