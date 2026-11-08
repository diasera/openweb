import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import {
  getAlbumSummaries,
  getPastEvents,
  getSettings,
  getUpcomingEvents,
} from "@/lib/data";
import { buildPageMetadata, getSiteUrl, PUBLIC_PAGE_SEO } from "@/lib/seo";
import {
  breadcrumbStructuredData,
  eventsStructuredData,
} from "@/lib/seo/structured-data";
import { timeZoneLabel } from "@/lib/utils/time";
import { PageShell } from "@/components/public/page-shell";
import { EventCard } from "@/components/public/event-card";
import { SectionHeader } from "@/components/ui/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), PUBLIC_PAGE_SEO.agenda);
}

export default async function AgendaPage() {
  const [settings, upcoming, past, albums] = await Promise.all([
    getSettings(),
    getUpcomingEvents(20),
    getPastEvents(12),
    getAlbumSummaries(),
  ]);
  const siteUrl = getSiteUrl(settings);
  const albumByEvent = new Map(
    albums.flatMap((album) =>
      album.event_id ? [[album.event_id, { slug: album.slug, title: album.title }] as const] : [],
    ),
  );
  const [next, ...later] = upcoming;

  return (
    <PageShell>
      <JsonLd
        data={[
          breadcrumbStructuredData(settings, [
            { name: "Beranda", path: "/" },
            { name: "Agenda", path: "/agenda" },
          ]),
          ...eventsStructuredData(settings, upcoming),
        ]}
      />
      <div className="space-y-7">
        <PageHeader
          size="large"
          title="Agenda"
          description={`Jadwal acara ${settings.site_name}. Semua waktu dalam ${timeZoneLabel()}.`}
        />

        {!next ? (
          <EmptyState
            icon={<CalendarDays className="h-8 w-8" />}
            title="Belum ada acara terjadwal"
            description="Acara baru akan tampil di sini dan di bilah atas."
          />
        ) : (
          <section className="space-y-3">
            <SectionHeader title="Berikutnya" />
            <EventCard
              event={next}
              siteUrl={siteUrl}
              featured
              album={albumByEvent.get(next.id)}
            />
            {later.length > 0 && (
              <div className="grid gap-3 md:grid-cols-2">
                {later.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    siteUrl={siteUrl}
                    album={albumByEvent.get(event.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {past.length > 0 && (
          <section>
            <SectionHeader title="Sudah lewat" />
            <div className="grid gap-3 md:grid-cols-2">
              {past.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  siteUrl={siteUrl}
                  past
                  album={albumByEvent.get(event.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </PageShell>
  );
}
