import Image from "next/image";
import { Newspaper, Play } from "lucide-react";
import { MotionLink, listReveal } from "@/components/motion";
import { cardClass } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaPreview } from "@/components/ui/media-preview";
import { SectionHeader } from "@/components/ui/section-header";
import type { MemberActivityItem } from "@/lib/members/activity-shared";
import { formatSiteDate } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

export type MemberTimelineViewMode = "timeline" | "grid";

function ActivityVisual({
  item,
  sizes = "88px",
}: {
  item: MemberActivityItem;
  sizes?: string;
}) {
  if (item.kind === "media") {
    return (
      <MediaPreview
        media={{ type: item.mediaType, url: item.mediaUrl }}
        alt=""
        sizes={sizes}
        seed={item.id}
        className="motion-media-image"
      />
    );
  }
  if (item.imageUrl) {
    return (
      <Image
        src={item.imageUrl}
        alt=""
        fill
        sizes={sizes}
        className="motion-media-image object-cover"
      />
    );
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

function groupByMonth(items: MemberActivityItem[]) {
  const groups: Array<{ label: string; items: MemberActivityItem[] }> = [];
  for (const item of items) {
    const label = formatSiteDate(item.occurredAt, "monthYear");
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }
  return groups;
}

/**
 * Linimasa & grid visual media/artikel yang menandai anggota:
 * dikelompokkan per bulan pada mode linimasa atau disajikan dalam grid kartu
 * visual pada mode grid.
 */
export function MemberTimeline({
  memberName,
  memberLabel,
  items,
  viewMode = "timeline",
  filtered = false,
  header = true,
}: {
  memberName: string;
  memberLabel: string;
  items: MemberActivityItem[];
  viewMode?: MemberTimelineViewMode;
  filtered?: boolean;
  header?: boolean;
}) {
  const grouped = viewMode === "timeline" ? groupByMonth(items) : [];

  const body =
    items.length === 0 ? (
      <EmptyState
        title={filtered ? "Tidak ada momen cocok" : "Belum ada momen"}
        description={
          filtered
            ? "Ubah filter jenis atau reset tanggal heatmap untuk melihat seluruh riwayat."
            : `Media atau artikel yang menyebut ${memberName} akan muncul di sini.`
        }
      />
    ) : viewMode === "grid" ? (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item, index) => {
          const reveal = listReveal(index);
          return (
            <MotionLink
              key={`${item.kind}-${item.id}`}
              href={item.href}
              prefetch={false}
              style={reveal.style}
              className={cn(
                cardClass("interactive", "group flex flex-col overflow-hidden"),
                reveal.className,
              )}
            >
              <span className="relative aspect-[4/3] w-full overflow-hidden">
                <ActivityVisual
                  item={item}
                  sizes="(max-width: 640px) 50vw, 220px"
                />
                {item.kind === "media" && item.mediaType === "video" && (
                  <span className="absolute inset-0 grid place-items-center bg-black/25 text-white">
                    <Play className="size-6 fill-current" aria-hidden="true" />
                  </span>
                )}
                <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[0.65rem] font-semibold text-white backdrop-blur-md">
                  {kindLabel(item)}
                </span>
              </span>
              <span className="flex flex-1 flex-col p-2.5">
                <span className="line-clamp-2 text-xs font-semibold leading-snug">
                  {item.title}
                </span>
                <span className="text-muted mt-1 text-[0.68rem]">
                  {formatSiteDate(item.occurredAt)}
                </span>
              </span>
            </MotionLink>
          );
        })}
      </div>
    ) : (
      <div className="space-y-6">
        {grouped.map((group) => (
          <div key={group.label} className="space-y-2.5">
            <h3 className="text-muted text-caption1 font-semibold uppercase tracking-wider">
              {group.label}
            </h3>
            <ol className="border-primary/25 relative ml-2 space-y-3 border-l-2 pl-5">
              {group.items.map((item, index) => {
                const reveal = listReveal(index);
                return (
                  <li
                    key={`${item.kind}-${item.id}`}
                    style={reveal.style}
                    className={cn("relative", reveal.className)}
                  >
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
                        <span className="mt-0.5 block truncate text-sm font-semibold">
                          {item.title}
                        </span>
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
          </div>
        ))}
      </div>
    );

  if (!header) return body;

  return (
    <section aria-labelledby="member-timeline">
      <SectionHeader
        id="member-timeline"
        eyebrow="Riwayat tag"
        title={`Jejak ${memberLabel.toLocaleLowerCase()}`}
        count={items.length}
      />
      {body}
    </section>
  );
}
