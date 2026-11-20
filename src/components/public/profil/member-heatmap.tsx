"use client";

import type { CSSProperties } from "react";
import { Activity, Flame, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  buildActivityHeatmap,
  type ActivityHeatmap,
  type MemberActivityItem,
} from "@/lib/members/activity-shared";
import { cardClass } from "@/components/ui/card";
import { formatCalendarDate } from "@/lib/utils/time";
import styles from "./member-heatmap.module.css";

const formatDate = (key: string) => formatCalendarDate(key, "dayMonth");
const LEVELS = [0, 1, 2, 3, 4] as const;

/**
 * Grafik aktivitas interaktif: intensitas momen per hari selama 26 minggu
 * beserta penanda bulan, ringkasan hari aktif & rentetan terpanjang, serta
 * klik/ketuk sel untuk menyaring linimasa ke tanggal tersebut.
 */
export function MemberHeatmap({
  items,
  heatmap: precomputed,
  memberLabel,
  selectedDate,
  onSelectDate,
}: {
  items: MemberActivityItem[];
  heatmap?: ActivityHeatmap;
  memberLabel: string;
  selectedDate?: string | null;
  onSelectDate?: (date: string | null) => void;
}) {
  const heatmap = precomputed ?? buildActivityHeatmap(items);
  const { days, total, weeks, activeDays, longestStreak, monthMarks } = heatmap;
  const interactive = Boolean(onSelectDate);

  return (
    <section
      aria-labelledby="member-heatmap"
      className={cardClass("elevated", "space-y-3 p-4 sm:p-5")}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="member-heatmap"
          className="flex items-center gap-2 text-subhead font-bold"
        >
          <Activity
            className="text-primary-readable size-4"
            aria-hidden="true"
          />
          Aktivitas {memberLabel}
        </h2>
        <div className="text-muted flex flex-wrap items-center gap-x-3 gap-y-1 text-caption1">
          <span>
            <strong className="text-foreground tabular-nums">{total}</strong>{" "}
            momen · {weeks} minggu
          </span>
          {activeDays > 0 && (
            <span>
              <strong className="text-foreground tabular-nums">
                {activeDays}
              </strong>{" "}
              hari aktif
            </span>
          )}
          {longestStreak > 1 && (
            <span className="inline-flex items-center gap-0.5">
              <Flame
                className="text-primary-readable size-3.5"
                aria-hidden="true"
              />
              <strong className="text-foreground tabular-nums">
                {longestStreak}
              </strong>{" "}
              hari beruntun
            </span>
          )}
        </div>
      </div>

      {/* Penanda bulan di atas grid */}
      <div className="space-y-1">
        <div
          aria-hidden="true"
          className="text-muted grid pl-6 text-[0.65rem] font-medium"
          style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}
        >
          {monthMarks.map((mark) => (
            <span
              key={`${mark.weekIndex}-${mark.label}`}
              style={{ gridColumnStart: mark.weekIndex + 1 }}
              className="truncate"
            >
              {mark.label}
            </span>
          ))}
        </div>

        <div className="flex items-stretch gap-1.5">
          {/* Penanda hari singkat */}
          <div
            aria-hidden="true"
            className="text-muted grid w-5 shrink-0 grid-rows-7 text-[0.6rem] leading-none"
          >
            <span className="self-center">Sen</span>
            <span />
            <span className="self-center">Rab</span>
            <span />
            <span className="self-center">Jum</span>
            <span />
            <span />
          </div>

          <div
            className={cn(styles.grid, "min-w-0 flex-1")}
            role={interactive ? "group" : "img"}
            aria-label={`Grafik aktivitas ${weeks} minggu terakhir: ${total} momen`}
          >
            {days.map((day, index) => {
              const isSelected = selectedDate === day.date;
              const label =
                day.count > 0
                  ? `${day.count} momen pada ${formatDate(day.date)}`
                  : `${formatDate(day.date)} — tidak ada momen`;

              if (interactive && day.count > 0) {
                return (
                  <button
                    key={day.date}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`Saring linimasa: ${label}`}
                    title={label}
                    onClick={() =>
                      onSelectDate?.(isSelected ? null : day.date)
                    }
                    className={cn(
                      styles.cell,
                      styles[`heat${day.level}`],
                      styles.cellInteractive,
                      isSelected && styles.cellSelected,
                    )}
                    style={{ "--week": Math.floor(index / 7) } as CSSProperties}
                  />
                );
              }

              return (
                <span
                  key={day.date}
                  className={cn(
                    styles.cell,
                    styles[`heat${day.level}`],
                    isSelected && styles.cellSelected,
                  )}
                  style={{ "--week": Math.floor(index / 7) } as CSSProperties}
                  title={label}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="text-muted flex flex-wrap items-center justify-between gap-2 text-caption2">
        <div className="flex items-center gap-2">
          {selectedDate ? (
            <button
              type="button"
              onClick={() => onSelectDate?.(null)}
              className="bg-primary/12 text-primary-readable inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold"
            >
              <span>Filter: {formatDate(selectedDate)}</span>
              <X className="size-3" aria-hidden="true" />
            </button>
          ) : (
            <span>
              {total === 0
                ? `Belum ada aktivitas dalam ${weeks} minggu terakhir.`
                : interactive
                  ? "Ketuk sel berwarna untuk menyaring linimasa"
                  : "Setengah tahun terakhir"}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1">
          Kurang
          {LEVELS.map((level) => (
            <span
              key={level}
              className={cn(styles.swatch, styles[`heat${level}`])}
            />
          ))}
          Banyak
        </span>
      </div>
    </section>
  );
}
