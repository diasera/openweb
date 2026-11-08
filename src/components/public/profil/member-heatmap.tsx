import type { CSSProperties } from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  buildActivityHeatmap,
  type MemberActivityItem,
} from "@/lib/members/activity";
import { cardClass } from "@/components/ui/card";
import { formatCalendarDate } from "@/lib/utils/time";
import styles from "./member-heatmap.module.css";

const formatDate = (key: string) => formatCalendarDate(key, "dayMonth");
const LEVELS = [0, 1, 2, 3, 4] as const;

/**
 * Grafik aktivitas: intensitas momen per hari selama setengah tahun. Data dari
 * getMemberActivity (tanpa query baru); label istilah mengikuti konfigurasi.
 */
export function MemberHeatmap({
  items,
  memberLabel,
}: {
  items: MemberActivityItem[];
  memberLabel: string;
}) {
  const { days, total, weeks } = buildActivityHeatmap(items);

  return (
    <section aria-labelledby="member-heatmap" className={cardClass("elevated", "space-y-3 p-4 sm:p-5")}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="member-heatmap" className="flex items-center gap-2 text-subhead font-bold">
          <Activity className="text-primary-readable size-4" aria-hidden="true" />
          Aktivitas {memberLabel}
        </h2>
        <p className="text-muted text-caption1">
          <strong className="text-foreground tabular-nums">{total}</strong> momen · {weeks} minggu
        </p>
      </div>

      <div
        className={styles.grid}
        role="img"
        aria-label={`Grafik aktivitas ${weeks} minggu terakhir: ${total} momen`}
      >
        {days.map((day, index) => (
          <span
            key={day.date}
            className={cn(styles.cell, styles[`heat${day.level}`])}
            style={{ "--week": Math.floor(index / 7) } as CSSProperties}
            title={day.count > 0 ? `${day.count} momen · ${formatDate(day.date)}` : formatDate(day.date)}
          />
        ))}
      </div>

      <div className="text-muted flex items-center justify-between gap-3 text-caption2">
        <span>{total === 0 ? `Belum ada aktivitas dalam ${weeks} minggu terakhir.` : "Setengah tahun terakhir"}</span>
        <span className="flex items-center gap-1">
          Kurang
          {LEVELS.map((level) => (
            <span key={level} className={cn(styles.swatch, styles[`heat${level}`])} />
          ))}
          Banyak
        </span>
      </div>
    </section>
  );
}
