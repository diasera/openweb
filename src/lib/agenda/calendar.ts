import type { EventRow } from "@/lib/types/database";
import { eventEndMs } from "./status";

export type CalendarEvent = Pick<
  EventRow,
  "id" | "title" | "description" | "location" | "url" | "starts_at" | "ends_at" | "updated_at"
>;

/** 2026-10-12T12:00:00.000Z → 20261012T120000Z (UTC, format iCalendar). */
function calendarStamp(ms: number): string {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 §3.1: baris maksimal 75 oktet; lanjutan diawali satu spasi. */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = chunks.length === 0 ? 75 : 74;
    if (currentBytes + size > limit) {
      chunks.push(current);
      current = char;
      currentBytes = size;
    } else {
      current += char;
      currentBytes += size;
    }
  }
  chunks.push(current);
  return chunks.join("\r\n ");
}

function eventDetails(event: CalendarEvent, pageUrl: string): string {
  return [event.description, event.url, pageUrl].filter(Boolean).join("\n\n");
}

/** File .ics satu acara: dibuka langsung oleh Kalender iOS/macOS, Outlook, dan Android. */
export function buildIcs(
  event: CalendarEvent,
  options: { siteName: string; pageUrl: string },
): string {
  const host = new URL(options.pageUrl).host;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${icsText(options.siteName)}//Agenda//ID`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@${host}`,
    `DTSTAMP:${calendarStamp(Date.parse(event.updated_at))}`,
    `DTSTART:${calendarStamp(Date.parse(event.starts_at))}`,
    `DTEND:${calendarStamp(eventEndMs(event))}`,
    `SUMMARY:${icsText(event.title)}`,
    `DESCRIPTION:${icsText(eventDetails(event, options.pageUrl))}`,
    event.location ? `LOCATION:${icsText(event.location)}` : null,
    `URL:${options.pageUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.filter((line): line is string => Boolean(line)).map(foldLine).join("\r\n")}\r\n`;
}

/** Tautan "tambah ke Google Calendar" untuk perangkat tanpa penangan .ics. */
export function googleCalendarUrl(event: CalendarEvent, pageUrl: string): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${calendarStamp(Date.parse(event.starts_at))}/${calendarStamp(eventEndMs(event))}`,
    details: eventDetails(event, pageUrl),
    location: event.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function eventAnchor(id: string): string {
  return `acara-${id}`;
}

export function eventPagePath(id: string): string {
  return `/agenda#${eventAnchor(id)}`;
}

export function eventIcsPath(id: string): string {
  return `/api/agenda/${id}/ics`;
}
