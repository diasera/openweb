/** Waktu relatif Bahasa Indonesia, mis. "2 jam lalu". Dipakai pesan, blog, media. */
export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "baru saja";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} bulan lalu`;
  return `${Math.floor(mo / 12)} tahun lalu`;
}

const DEFAULT_TIME_ZONE = "Asia/Jakarta";

function resolveTimeZone(value: string | undefined): string {
  const candidate = value?.trim();
  if (!candidate) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/**
 * Zona waktu tampilan situs (agenda, "kenangan hari ini"). Render server dan
 * browser memakai zona yang sama agar teks waktu identik (tanpa hydration mismatch).
 */
export const SITE_TIME_ZONE = resolveTimeZone(process.env.NEXT_PUBLIC_SITE_TIME_ZONE);

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partFormatters = new Map<string, Intl.DateTimeFormat>();

export function zonedParts(date: Date, timeZone = SITE_TIME_ZONE): ZonedParts {
  let formatter = partFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partFormatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
    Math.floor(date.getTime() / 1000) * 1000
  );
}

/** Nilai `datetime-local` ("2026-10-12T19:00") di zona situs → instan UTC. */
export function zonedInputToDate(
  value: string,
  timeZone = SITE_TIME_ZONE,
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number) as number[];
  const guess = Date.UTC(y!, mo! - 1, d!, h!, mi!);
  const first = guess - offsetMs(new Date(guess), timeZone);
  const firstOffset = offsetMs(new Date(first), timeZone);
  let result = first;
  if (guess - firstOffset !== first) {
    // Offset berganti di sekitar jam ini (DST). Jam dinding yang tidak ada
    // (celah) digeser maju, sama seperti kalender umum dan Temporal "compatible".
    const second = guess - firstOffset;
    result =
      offsetMs(new Date(second), timeZone) === firstOffset
        ? second
        : Math.max(first, second);
  }
  const date = new Date(result);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Instan ISO → nilai `datetime-local` di zona situs. */
export function toZonedInputValue(iso: string, timeZone = SITE_TIME_ZONE): string {
  const p = zonedParts(new Date(iso), timeZone);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Selisih hari kalender di zona situs (H-n): 0 = hari ini, 1 = besok. */
export function calendarDaysBetween(
  from: Date,
  to: Date,
  timeZone = SITE_TIME_ZONE,
): number {
  const a = zonedParts(from, timeZone);
  const b = zonedParts(to, timeZone);
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) /
      86_400_000,
  );
}

/** Singkatan zona untuk label, mis. "WIB". */
export function timeZoneLabel(timeZone = SITE_TIME_ZONE): string {
  return (
    new Intl.DateTimeFormat("id-ID", { timeZone, timeZoneName: "short" })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value ?? timeZone
  );
}

const dateLabel = new Intl.DateTimeFormat("id-ID", {
  timeZone: SITE_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const timeLabel = new Intl.DateTimeFormat("id-ID", {
  timeZone: SITE_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

/** Label jadwal, mis. "Sab, 12 Okt 2026 · 19.00–21.00 WIB". */
export function formatEventSchedule(startsAt: string, endsAt?: string | null): string {
  const start = new Date(startsAt);
  const zone = timeZoneLabel();
  if (!endsAt) return `${dateLabel.format(start)} · ${timeLabel.format(start)} ${zone}`;
  const end = new Date(endsAt);
  return calendarDaysBetween(start, end) === 0
    ? `${dateLabel.format(start)} · ${timeLabel.format(start)}–${timeLabel.format(end)} ${zone}`
    : `${dateLabel.format(start)} ${timeLabel.format(start)} – ${dateLabel.format(end)} ${timeLabel.format(end)} ${zone}`;
}

const monthShort = new Intl.DateTimeFormat("id-ID", {
  timeZone: SITE_TIME_ZONE,
  month: "short",
});

/** Isi ubin tanggal kalender (hari + bulan singkat) di zona situs. */
export function eventDateTile(iso: string): { day: string; month: string } {
  const date = new Date(iso);
  return {
    day: String(zonedParts(date).day),
    month: monthShort.format(date).replace(".", ""),
  };
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function countdownParts(ms: number): CountdownParts {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor((total % 86_400) / 3_600),
    minutes: Math.floor((total % 3_600) / 60),
    seconds: total % 60,
  };
}
