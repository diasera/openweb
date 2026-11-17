import { ArrowUpRight, ExternalLink, MapPin } from "lucide-react";
import { MotionLink } from "@/components/motion";
import { cardClass } from "@/components/ui/card";
import {
  EventCountdown,
  EventStatusBadge,
} from "@/components/public/event-countdown";
import { AddToCalendar } from "@/components/public/add-to-calendar";
import { ShareButton } from "@/components/public/share-save";
import type { PublicEvent } from "@/lib/data";
import {
  eventAnchor,
  eventIcsPath,
  eventMapsUrl,
  eventPagePath,
  googleCalendarUrl,
  outlookCalendarUrl,
} from "@/lib/agenda/calendar";
import { eventDateTile, formatEventSchedule } from "@/lib/utils/time";
import { isExternalHref, normalizeNotificationHref } from "@/lib/utils/url";
import { cn } from "@/lib/utils/cn";

/**
 * Kartu acara bergaya Luma: ubin tanggal iOS, lencana status waktu nyata,
 * tautan lokasi langsung ke Peta, hitung mundur, ekspor multi-kalender, dan
 * pembagi tautan acara spesifik.
 */
export function EventCard({
  event,
  siteUrl,
  featured = false,
  past = false,
  album,
}: {
  event: PublicEvent;
  siteUrl: string;
  featured?: boolean;
  past?: boolean;
  album?: { slug: string; title: string } | null;
}) {
  const tile = eventDateTile(event.starts_at);
  const relativePath = eventPagePath(event.id);
  const pageUrl = new URL(relativePath, siteUrl).toString();
  const safeHref = normalizeNotificationHref(event.url);
  const externalLink = safeHref ? isExternalHref(safeHref) : false;

  return (
    <article
      id={eventAnchor(event.id)}
      className={cardClass(
        "elevated",
        cn(
          "scroll-mt-24 p-4",
          featured && "aurora relative sm:p-6",
        ),
      )}
    >
      <div className={cn("flex gap-3.5", featured && "sm:gap-5")}>
        {/* Ubin ala ikon Kalender iOS: pita bulan + tanggal besar. */}
        <span
          className={cn(
            "border-border bg-surface shadow-soft w-14 shrink-0 self-start overflow-hidden rounded-2xl border text-center leading-none",
            featured && "sm:w-16 motion-blur-in",
          )}
          aria-hidden="true"
        >
          <span
            className={cn(
              "block py-1 text-caption2 font-bold uppercase",
              past ? "bg-surface-2 text-muted" : "gloss bg-primary text-primary-foreground",
            )}
          >
            {tile.month}
          </span>
          <span className={cn("block py-2 text-title2 font-bold", past && "text-muted")}>
            {tile.day}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={cn(
                "font-display font-bold leading-snug",
                featured ? "text-xl sm:text-title2" : "text-body",
              )}
            >
              {event.title}
            </h3>
            {(!featured || past) && <EventStatusBadge event={event} />}
          </div>
          <p className="text-muted mt-0.5 text-footnote">
            {formatEventSchedule(event.starts_at, event.ends_at)}
          </p>
          {event.location && (
            <a
              href={eventMapsUrl(event.location)}
              target="_blank"
              rel="noopener noreferrer"
              title={`Buka lokasi ${event.location} di Peta`}
              className="text-muted hover:text-primary-readable mt-0.5 inline-flex max-w-full items-center gap-1 text-footnote transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{event.location}</span>
              <ArrowUpRight className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>

      {event.description && (
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{event.description}</p>
      )}

      {!past && featured && <EventCountdown event={event} className="mt-5" />}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!past && (
          <AddToCalendar
            icsHref={eventIcsPath(event.id)}
            googleHref={googleCalendarUrl(event, pageUrl)}
            outlookHref={outlookCalendarUrl(event, pageUrl)}
          />
        )}
        <ShareButton
          title={event.title}
          href={relativePath}
          variant="outlineSm"
          label="Bagikan"
        />
        {safeHref && (
          <a
            href={safeHref}
            {...(externalLink ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="text-primary-readable inline-flex items-center gap-1 px-2 text-sm font-semibold"
          >
            Info lengkap <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
        {album && (
          <MotionLink
            href={`/album/${album.slug}`}
            className="text-primary-readable px-2 text-sm font-semibold"
          >
            Lihat album →
          </MotionLink>
        )}
      </div>
    </article>
  );
}
