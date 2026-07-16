import { ImageIcon } from "lucide-react";
import { Masonry } from "@/components/ui/masonry";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaCard } from "./media-card";
import type { MediaRow } from "@/lib/types/database";

/** Grid masonry "Sorotan" untuk media pilihan yang dipin admin. */
export function HighlightGrid({ media }: { media: MediaRow[] }) {
  if (media.length === 0) {
    return (
      <EmptyState
        icon={<ImageIcon className="h-8 w-8" />}
        title="Belum ada sorotan"
        description="Foto & video yang dipin admin akan tampil di sini."
      />
    );
  }

  return (
    <Masonry>
      {media.map((m) => (
        <MediaCard key={m.id} media={m} />
      ))}
    </Masonry>
  );
}
