"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List, X } from "lucide-react";
import { SectionHeader } from "@/components/ui/section-header";
import { Segmented } from "@/components/ui/segmented";
import { MemberHeatmap } from "@/components/public/profil/member-heatmap";
import {
  MemberTimeline,
  type MemberTimelineViewMode,
} from "@/components/public/profil/member-timeline";
import {
  activityDateKey,
  type ActivityHeatmap,
  type MemberActivityItem,
} from "@/lib/members/activity-shared";
import { formatCalendarDate } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

type ActivityKindFilter = "all" | "media" | "blog";

/**
 * Penjelajah aktivitas anggota terpadu: menyambungkan klik sel pada
 * `MemberHeatmap` ke `MemberTimeline` beserta filter Semua/Media/Artikel dan
 * sakelar tampilan Linimasa/Grid.
 */
export function MemberActivityExplorer({
  initialHeatmap,
  items,
  memberName,
  memberLabel,
}: {
  initialHeatmap: ActivityHeatmap;
  items: MemberActivityItem[];
  memberName: string;
  memberLabel: string;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<ActivityKindFilter>("all");
  const [viewMode, setViewMode] = useState<MemberTimelineViewMode>("timeline");

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (kindFilter !== "all" && item.kind !== kindFilter) return false;
      if (selectedDate && activityDateKey(item) !== selectedDate) return false;
      return true;
    });
  }, [items, kindFilter, selectedDate]);

  const hasMedia = items.some((i) => i.kind === "media");
  const hasBlog = items.some((i) => i.kind === "blog");
  const showControls = items.length > 0 && (hasMedia || hasBlog);

  return (
    <div className="space-y-8">
      <MemberHeatmap
        items={items}
        heatmap={initialHeatmap}
        memberLabel={memberLabel}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      <section aria-labelledby="member-timeline" className="space-y-4">
        <SectionHeader
          id="member-timeline"
          eyebrow="Riwayat tag"
          title={`Jejak ${memberLabel.toLocaleLowerCase()}`}
          count={filtered.length}
        />

        {showControls && (
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {hasMedia && hasBlog ? (
              <div className="min-w-52 flex-1">
                <Segmented
                  value={kindFilter}
                  onChange={setKindFilter}
                  options={[
                    { label: "Semua", value: "all" },
                    { label: "Media", value: "media" },
                    { label: "Artikel", value: "blog" },
                  ]}
                />
              </div>
            ) : (
              <span />
            )}

            <div
              role="group"
              aria-label="Mode tampilan jejak aktivitas"
              className="bg-surface-2 inline-flex shrink-0 items-center rounded-full p-1"
            >
              <button
                type="button"
                aria-pressed={viewMode === "timeline"}
                onClick={() => setViewMode("timeline")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption1 font-semibold transition-colors",
                  viewMode === "timeline"
                    ? "bg-surface text-foreground shadow-2xs"
                    : "text-muted hover:text-foreground",
                )}
              >
                <List className="size-3.5" aria-hidden="true" />
                Linimasa
              </button>
              <button
                type="button"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-caption1 font-semibold transition-colors",
                  viewMode === "grid"
                    ? "bg-surface text-foreground shadow-2xs"
                    : "text-muted hover:text-foreground",
                )}
              >
                <LayoutGrid className="size-3.5" aria-hidden="true" />
                Grid
              </button>
            </div>
          </div>
        )}

        {selectedDate && (
          <div className="border-primary/25 bg-primary/8 flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2 text-xs">
            <span>
              Menampilkan jejak pada{" "}
              <strong>{formatCalendarDate(selectedDate, "dayMonth")}</strong>
            </span>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-primary-readable inline-flex items-center gap-1 font-semibold hover:underline"
            >
              Reset
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        <MemberTimeline
          memberName={memberName}
          memberLabel={memberLabel}
          items={filtered}
          viewMode={viewMode}
          filtered={Boolean(selectedDate) || kindFilter !== "all"}
          header={false}
        />
      </section>
    </div>
  );
}
