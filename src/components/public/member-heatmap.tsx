import { cn } from "@/lib/utils/cn";
import {
  buildActivityHeatmap,
  type MemberActivityItem,
} from "@/lib/members/activity";
import { cardClass } from "@/components/ui/card";
import styles from "./member-heatmap.module.css";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Grafik aktivitas {memberLabel}: intensitas momen per hari selama setengah
 * tahun. Semua data dari getMemberActivity (tanpa query baru); label istilah
 * mengikuti konfigurasi admin sehingga netral untuk jenis komunitas apa pun.
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
    <section className={cn(styles.card, cardClass("elevated"))} aria-label="Grafik aktivitas">
      <div className={styles.headerRow}>
        <h2 className={styles.title}>Aktivitas {memberLabel}</h2>
        <p className={styles.total}>
          <strong>{total}</strong> momen · {weeks} minggu terakhir
        </p>
      </div>

      <div className={styles.grid} role="img" aria-label={`Grafik aktivitas setengah tahun: ${total} momen`}>
        {days.map((day) => (
          <span
            key={day.date}
            className={cn(styles.cell, styles[`heat${day.level}`])}
            title={day.count > 0 ? `${day.count} momen · ${formatDate(day.date)}` : formatDate(day.date)}
          />
        ))}
      </div>

      <div className={styles.legend}>
        <span>Kurang</span>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <span key={level} className={cn(styles.swatch, styles[`heat${level}`])} />
        ))}
        <span>Banyak</span>
      </div>

      {total === 0 && (
        <p className={styles.empty}>
          Belum ada aktivitas dalam {weeks} minggu terakhir.
        </p>
      )}
    </section>
  );
}
