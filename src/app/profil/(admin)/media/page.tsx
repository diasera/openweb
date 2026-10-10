import Link from "next/link";
import { FolderOpen, Images, MessageSquareText } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import {
  getAdminMedia,
  getMediaStatusCounts,
  type MediaFilter,
} from "@/lib/admin/media";
import { getAdminAlbumOptions } from "@/lib/admin/albums";
import { isOneOf } from "@/lib/admin/guard";
import { adminFeatureHref, MEDIA_ADMIN_SECTIONS } from "@/lib/constants";
import { buildAdminPageMetadata } from "@/lib/seo";
import { parsePageParam } from "@/lib/utils/url";
import { listReveal } from "@/components/motion";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/public/pagination";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { MediaModerationCard } from "@/components/admin/media/media-moderation-card";

export const metadata = buildAdminPageMetadata("Media");

const BASE_PATH = adminFeatureHref("media");
// Urutan tab = urutan semua daftar admin: Semua dulu (default), lalu status.
const FILTERS = ["all", "approved", "rejected", "pending"] as const satisfies readonly MediaFilter[];
const EMPTY_COPY: Record<MediaFilter, string> = {
  pending: "Tidak ada kiriman yang menunggu. Semua sudah ditinjau.",
  approved: "Belum ada media yang terbit.",
  rejected: "Tidak ada media yang ditolak.",
  all: "Belum ada media sama sekali.",
};

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireFeature("media");
  const { status, page } = await searchParams;
  const filter: MediaFilter = isOneOf(status, FILTERS) ? status : "all";
  const [result, counts, albums] = await Promise.all([
    getAdminMedia(filter, parsePageParam(page)),
    getMediaStatusCounts(),
    getAdminAlbumOptions(),
  ]);

  return (
    <AdminPage
      feature="media"
      title="Media"
      description="Tinjau kiriman, pilih sorotan halaman depan, dan kelompokkan ke album. Media yang terbit tetap masuk Galeri walau bukan sorotan."
      actions={
        <>
          <Link
            href={MEDIA_ADMIN_SECTIONS.album.href}
            className={buttonClass({ variant: "outline", size: "sm" })}
          >
            <FolderOpen className="size-4" aria-hidden="true" /> Album
          </Link>
          <Link
            href={MEDIA_ADMIN_SECTIONS.komentar.href}
            className={buttonClass({ variant: "outline", size: "sm" })}
          >
            <MessageSquareText className="size-4" aria-hidden="true" /> Komentar
          </Link>
        </>
      }
      toolbar={
        <AdminTabs
          basePath={BASE_PATH}
          active={filter}
          items={[
            { label: "Semua", value: "all", count: counts.all },
            { label: "Terbit", value: "approved", count: counts.approved },
            { label: "Ditolak", value: "rejected", count: counts.rejected },
            { label: "Menunggu", value: "pending", count: counts.pending, alert: counts.pending > 0 },
          ]}
        />
      }
    >
      {result.rows.length === 0 ? (
        <EmptyState
          icon={<Images className="size-8" />}
          title="Tidak ada media"
          description={EMPTY_COPY[filter]}
        />
      ) : (
        <ul
          aria-label="Media untuk dimoderasi"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        >
          {result.rows.map((media, index) => (
            <li key={media.id} {...listReveal(index)}>
              <MediaModerationCard media={media} albums={albums} />
            </li>
          ))}
        </ul>
      )}
      <Pagination
        basePath={BASE_PATH}
        current={result.page}
        total={result.totalPages}
        query={{ status: filter === "all" ? undefined : filter }}
      />
    </AdminPage>
  );
}
