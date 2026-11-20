import {
  calendarKey,
  formatCalendarDate,
  siteDateKey,
  zonedParts,
} from "@/lib/utils/time";

export type MemberActivityItem =
  | {
      kind: "media";
      id: string;
      href: string;
      title: string;
      description: string | null;
      occurredAt: string;
      mediaType: "photo" | "video";
      /** URL media asli; video dipratinjau dari frame pertamanya. */
      mediaUrl: string;
    }
  | {
      kind: "blog";
      id: string;
      href: string;
      title: string;
      description: string | null;
      occurredAt: string;
      imageUrl: string | null;
    };

/** Sel satu hari pada grafik aktivitas. */
export interface ActivityHeatmapDay {
  /** ISO date (yyyy-mm-dd) — kunci stabil untuk React. */
  date: string;
  /** 0 = kosong; 1..4 = intensitas naik. */
  level: 0 | 1 | 2 | 3 | 4;
  /** Jumlah momen pada hari itu. */
  count: number;
}

export interface ActivityHeatmapMonthMark {
  weekIndex: number;
  label: string;
}

export interface ActivityHeatmap {
  days: ActivityHeatmapDay[];
  total: number;
  /** Senin di kolom pertama; minggu berjalan di kolom terakhir. */
  weeks: number;
  activeDays: number;
  longestStreak: number;
  monthMarks: ActivityHeatmapMonthMark[];
}

/** Ambil level dari jumlah: 0 lalu 1..4 dengan batas 5+. */
function heatLevel(count: number): ActivityHeatmapDay["level"] {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

const DAY_MS = 86_400_000;

/**
 * Bangun data grafik aktivitas (grid minggu × hari) dari item aktivitas yang
 * sudah ada — fungsi pure tanpa query tambahan yang aman dipakai di server
 * maupun klien (untuk cross-filtering).
 */
export function buildActivityHeatmap(
  items: MemberActivityItem[],
  weeks = 26,
  now = new Date(),
): ActivityHeatmap {
  const perDay = new Map<string, number>();
  for (const item of items) {
    const stamp = Date.parse(item.occurredAt);
    if (Number.isNaN(stamp)) continue;
    const key = siteDateKey(new Date(stamp));
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }

  const today = zonedParts(now);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  const weekday = (new Date(todayUtc).getUTCDay() + 6) % 7;
  const mondayUtc = todayUtc - (weekday + (weeks - 1) * 7) * DAY_MS;

  const days: ActivityHeatmapDay[] = [];
  const monthMarks: ActivityHeatmapMonthMark[] = [];
  let total = 0;
  let activeDays = 0;
  let longestStreak = 0;
  let currentStreak = 0;
  let lastMonthKey = "";

  for (let offset = 0; offset < weeks * 7; offset += 1) {
    const dayUtc = mondayUtc + offset * DAY_MS;
    const day = new Date(dayUtc);
    const year = day.getUTCFullYear();
    const month = day.getUTCMonth() + 1;
    const dateNum = day.getUTCDate();
    const key = calendarKey(year, month, dateNum);

    if (offset % 7 === 0) {
      const monthKey = `${year}-${month}`;
      if (monthKey !== lastMonthKey) {
        const weekIndex = offset / 7;
        const prevMark = monthMarks[monthMarks.length - 1];
        // Hindari label bulan saling menempel bila minggu pertama hanya 1 kolom.
        if (!prevMark || weekIndex - prevMark.weekIndex >= 2) {
          const formatted =
            formatCalendarDate(key, "monthYear").split(" ")[0] ?? "";
          monthMarks.push({ weekIndex, label: formatted.slice(0, 3) });
        }
        lastMonthKey = monthKey;
      }
    }

    const count = dayUtc > todayUtc ? 0 : (perDay.get(key) ?? 0);
    total += count;
    if (count > 0) {
      activeDays += 1;
      currentStreak += 1;
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }

    days.push({ date: key, level: heatLevel(count), count });
  }

  return { days, total, weeks, activeDays, longestStreak, monthMarks };
}

/** Kunci tanggal lokal situs untuk menyaring linimasa terhadap sel heatmap. */
export function activityDateKey(item: Pick<MemberActivityItem, "occurredAt">): string {
  const stamp = Date.parse(item.occurredAt);
  if (Number.isNaN(stamp)) return "";
  return siteDateKey(new Date(stamp));
}
