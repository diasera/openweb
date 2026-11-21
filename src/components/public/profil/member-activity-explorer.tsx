"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
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

            <Segmented
              size="sm"
              ariaLabel="Mode tampilan jejak aktivitas"
              value={viewMode}
              onChange={setViewMode}
              options={[
                {
                  value: "timeline",
                  label: "Linimasa",
                  icon: <List className="size-3.5" aria-hidden="true" />,
                },
                {
                  value: "grid",
                  label: "Grid",
                  icon: <LayoutGrid className="size-3.5" aria-hidden="true" />,
                },
              ]}
            />
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
