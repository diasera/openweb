import Image from "next/image";
import { Newspaper, Play } from "lucide-react";
import { MotionLink, listReveal } from "@/components/motion";
import { cardClass } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaPreview } from "@/components/ui/media-preview";
import { SectionHeader } from "@/components/ui/section-header";
import type { MemberActivityItem } from "@/lib/members/activity";
import { formatSiteDate } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

function ActivityVisual({ item }: { item: MemberActivityItem }) {
  if (item.kind === "media") {
    return (
      <MediaPreview
        media={{ type: item.mediaType, url: item.mediaUrl, thumbnail_url: item.thumbnailUrl }}
        alt=""
        sizes="88px"
        seed={item.id}
        className="motion-media-image"
      />
    );
  }
  if (item.imageUrl) {
    return <Image src={item.imageUrl} alt="" fill sizes="88px" className="motion-media-image object-cover" />;
  }
  return (
    <span className="from-primary/18 to-accent/12 text-primary-readable grid h-full w-full place-items-center bg-linear-to-br">
      <Newspaper className="size-6" aria-hidden="true" />
    </span>
  );
}

function kindLabel(item: MemberActivityItem) {
  if (item.kind === "blog") return "Artikel";
  return item.mediaType === "video" ? "Video" : "Foto";
}

/**
 * Linimasa media & artikel yang menandai anggota: garis vertikal dengan titik
 * per momen, kartu bergambar yang bangkit saat digulir.
 */
export function MemberTimeline({
  memberName,
  memberLabel,
  items,
}: {
  memberName: string;
  memberLabel: string;
  items: MemberActivityItem[];
}) {
  return (
    <section aria-labelledby="member-timeline">
      <SectionHeader
        id="member-timeline"
        eyebrow="Riwayat tag"
        title={`Jejak ${memberLabel.toLocaleLowerCase()}`}
        count={items.length}
      />
      {items.length === 0 ? (
        <EmptyState
          title="Belum ada momen"
          description={`Media atau artikel yang menyebut ${memberName} akan muncul di sini.`}
        />
      ) : (
        <ol className="border-primary/25 relative ml-2 space-y-3 border-l-2 pl-5">
          {items.map((item, index) => {
            const reveal = listReveal(index);
            return (
            <li key={`${item.kind}-${item.id}`} style={reveal.style} className={cn("relative", reveal.className)}>
              <span
                aria-hidden="true"
                className="bg-surface ring-primary/60 absolute -left-[26px] top-1/2 size-2.5 -translate-y-1/2 rounded-full ring-2"
              />
              <MotionLink
                href={item.href}
                prefetch={false}
                className={cardClass(
                  "interactive",
                  "group flex min-w-0 items-center gap-3 overflow-hidden p-2.5",
                )}
              >
                <span className="relative size-[76px] shrink-0 overflow-hidden rounded-xl">
                  <ActivityVisual item={item} />
                  {item.kind === "media" && item.mediaType === "video" && (
                    <span className="absolute inset-0 grid place-items-center bg-black/20 text-white">
                      <Play className="size-5 fill-current" aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1 py-0.5">
                  <span className="text-primary-readable text-caption2 font-bold uppercase tracking-wider">
                    {kindLabel(item)} · {formatSiteDate(item.occurredAt)}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-semibold">{item.title}</span>
                  {item.description && (
                    <span className="text-muted mt-0.5 line-clamp-2 text-caption1 leading-relaxed">
                      {item.description}
                    </span>
                  )}
                </span>
              </MotionLink>
            </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
