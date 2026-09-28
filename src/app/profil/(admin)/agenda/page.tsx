import { CalendarDays } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import { getAdminEvents } from "@/lib/admin/events";
import { isSchemaOutdatedError, SCHEMA_OUTDATED_MESSAGE } from "@/lib/database/errors";
import { eventPhase } from "@/lib/agenda/status";
import { buildAdminPageMetadata } from "@/lib/seo";
import {
  eventDateTile,
  formatEventSchedule,
  timeZoneLabel,
  toZonedInputValue,
} from "@/lib/utils/time";
import { parsePageParam } from "@/lib/utils/url";
import { cn } from "@/lib/utils/cn";
import { PageHeader } from "@/components/ui/page-header";
import { EventDialog } from "@/components/admin/event-dialog";
import { DeleteButton } from "@/components/admin/confirmed-action-button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/public/pagination";
import { deleteEvent } from "./actions";

export const metadata = buildAdminPageMetadata("Agenda");

const PHASE_LABEL = {
  upcoming: "Mendatang",
  ongoing: "Berlangsung",
  past: "Selesai",
} as const;

export default async function AgendaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireFeature("agenda");
  const { page } = await searchParams;
  const { result, error, fetchedAt } = await getAdminEvents(parsePageParam(page));
  const zone = timeZoneLabel();

  return (
    <div>
      <PageHeader
        title="Agenda"
        description={`Jadwal acara publik. Acara terdekat tampil dengan hitung mundur di bilah atas. Waktu dalam ${zone}.`}
        action={<EventDialog zoneLabel={zone} />}
      />

      {error ? (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title="Agenda belum aktif"
          description={
            isSchemaOutdatedError(error)
              ? SCHEMA_OUTDATED_MESSAGE
              : "Agenda gagal dimuat. Coba muat ulang."
          }
        />
      ) : result.rows.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-8 w-8" />}
          title="Belum ada acara"
          description="Tambahkan acara pertama; pengunjung bisa menyimpannya ke kalender."
        />
      ) : (
        <div className="space-y-2">
          {result.rows.map((event) => {
            const tile = eventDateTile(event.starts_at);
            const phase = eventPhase(event, fetchedAt);
            return (
              <Card key={event.id} className="flex items-center gap-3 p-3">
                <span
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-xl text-center leading-none",
                    phase === "past" ? "bg-surface-2 text-muted" : "bg-primary/10 text-primary-readable",
                  )}
                >
                  <span>
                    <span className="block text-lg font-bold">{tile.day}</span>
                    <span className="block text-caption2 font-semibold uppercase">{tile.month}</span>
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{event.title}</p>
                    {!event.is_published && <Chip variant="outline">draf</Chip>}
                  </div>
                  <p className="text-muted truncate text-xs">
                    {PHASE_LABEL[phase]} · {formatEventSchedule(event.starts_at, event.ends_at)}
                    {event.location ? ` · ${event.location}` : ""}
                  </p>
                </div>
                <EventDialog
                  zoneLabel={zone}
                  event={{
                    id: event.id,
                    title: event.title,
                    description: event.description,
                    location: event.location,
                    url: event.url,
                    is_published: event.is_published,
                    startsLocal: toZonedInputValue(event.starts_at),
                    endsLocal: event.ends_at ? toZonedInputValue(event.ends_at) : "",
                  }}
                />
                <DeleteButton
                  action={deleteEvent}
                  id={event.id}
                  message={`Hapus acara "${event.title}"?`}
                />
              </Card>
            );
          })}
        </div>
      )}
      <Pagination basePath="/profil/agenda" current={result.page} total={result.totalPages} />
    </div>
  );
}
