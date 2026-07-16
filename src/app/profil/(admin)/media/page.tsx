import { Images } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import { getAdminMedia, type MediaFilter } from "@/lib/admin/media";
import { buildAdminPageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/admin/page-header";
import { FilterTabs } from "@/components/admin/filter-tabs";
import { MediaAdminCard } from "@/components/admin/media-admin-card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = buildAdminPageMetadata("Media");

const FILTERS: MediaFilter[] = ["pending", "approved", "rejected", "all"];

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireFeature("media");
  const { status } = await searchParams;
  const filter: MediaFilter = FILTERS.includes(status as MediaFilter)
    ? (status as MediaFilter)
    : "pending";
  const media = await getAdminMedia(filter);

  return (
    <div>
      <PageHeader
        title="Media"
        description="Tinjau, setujui, dan pilih media untuk halaman depan. Unggahan approved tetap masuk Galeri meski tidak dipin."
      />

      <FilterTabs
        basePath="/profil/media"
        active={filter}
        items={[
          { label: "Menunggu", value: "pending" },
          { label: "Disetujui", value: "approved" },
          { label: "Ditolak", value: "rejected" },
          { label: "Semua", value: "all" },
        ]}
      />

      {media.length === 0 ? (
        <EmptyState
          icon={<Images className="h-8 w-8" />}
          title="Tidak ada media"
          description="Belum ada media pada filter ini."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
          {media.map((m) => (
            <MediaAdminCard key={m.id} media={m} />
          ))}
        </div>
      )}
    </div>
  );
}
