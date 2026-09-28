import Link from "next/link";
import { FolderOpen, Images, MessageSquareText } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import {
  getAdminMedia,
  getMediaStatusCounts,
  type MediaFilter,
} from "@/lib/admin/media";
import { getAdminAlbumOptions } from "@/lib/admin/albums";
import { MEDIA_ADMIN_SECTIONS } from "@/lib/constants";
import { buildAdminPageMetadata } from "@/lib/seo";
import { parsePageParam } from "@/lib/utils/url";
import { PageHeader } from "@/components/ui/page-header";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { MediaAdminCard } from "@/components/admin/media-admin-card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/public/pagination";

export const metadata = buildAdminPageMetadata("Media");

const FILTERS: MediaFilter[] = ["pending", "approved", "rejected", "all"];

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  await requireFeature("media");
  const { status, page } = await searchParams;
  const filter: MediaFilter = FILTERS.includes(status as MediaFilter)
    ? (status as MediaFilter)
    : "pending";
  const [result, counts, albums] = await Promise.all([
    getAdminMedia(filter, parsePageParam(page)),
    getMediaStatusCounts(),
    getAdminAlbumOptions(),
  ]);

  return (
    <div>
      <PageHeader
        title="Media"
        description="Tinjau, setujui, dan pilih media untuk halaman depan. Unggahan approved tetap masuk Galeri meski tidak dipin."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={MEDIA_ADMIN_SECTIONS.album.href}
              className={buttonClass({ variant: "outline", size: "sm" })}
            >
              <FolderOpen className="h-4 w-4" aria-hidden="true" /> Album
            </Link>
            <Link
              href={MEDIA_ADMIN_SECTIONS.komentar.href}
              className={buttonClass({ variant: "outline", size: "sm" })}
            >
              <MessageSquareText className="h-4 w-4" aria-hidden="true" /> Komentar
            </Link>
          </div>
        }
      />

      <FilterTabs
        basePath="/profil/media"
        active={filter}
        items={[
          { label: `Menunggu (${counts.pending})`, value: "pending" },
          { label: `Disetujui (${counts.approved})`, value: "approved" },
          { label: `Ditolak (${counts.rejected})`, value: "rejected" },
          { label: `Semua (${counts.all})`, value: "all" },
        ]}
      />

      {result.rows.length === 0 ? (
        <EmptyState
          icon={<Images className="h-8 w-8" />}
          title="Tidak ada media"
          description="Belum ada media pada filter ini."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {result.rows.map((m) => (
            <MediaAdminCard key={m.id} media={m} albums={albums} />
          ))}
        </div>
      )}
      <Pagination
        basePath="/profil/media"
        current={result.page}
        total={result.totalPages}
        query={{ status: filter }}
      />
    </div>
  );
}
