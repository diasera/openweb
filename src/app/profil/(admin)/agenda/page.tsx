import { CalendarDays, ExternalLink } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import { getAdminEvents } from "@/lib/admin/events";
import { isSchemaOutdatedError, SCHEMA_OUTDATED_MESSAGE } from "@/lib/database/errors";
import { eventPhase } from "@/lib/agenda/status";
import { eventPagePath } from "@/lib/agenda/calendar";
import { adminFeatureHref } from "@/lib/constants";
import { buildAdminPageMetadata } from "@/lib/seo";
import {
  eventDateTile,
  formatEventSchedule,
  timeZoneLabel,
  toZonedInputValue,
} from "@/lib/utils/time";
import { parsePageParam } from "@/lib/utils/url";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/public/pagination";
import { AdminPage } from "@/components/admin/admin-page";
import {
  AdminList,
  AdminRow,
  LeadingDate,
  StatusBadge,
  type BadgeTone,
} from "@/components/admin/admin-list";
import { DeleteAction, IconLink } from "@/components/admin/admin-actions";
import { EventDialog } from "@/components/admin/agenda/event-dialog";
import { deleteEvent } from "./actions";

export const metadata = buildAdminPageMetadata("Agenda");

const PHASE: Record<"upcoming" | "ongoing" | "past", { label: string; tone: BadgeTone }> = {
  upcoming: { label: "Mendatang", tone: "primary" },
  ongoing: { label: "Berlangsung", tone: "success" },
  past: { label: "Selesai", tone: "neutral" },
};

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
    <AdminPage
      feature="agenda"
      title="Agenda"
      description={`Jadwal acara publik. Acara terdekat tampil dengan hitung mundur di bilah atas dan halaman depan. Waktu dalam ${zone}.`}
      actions={<EventDialog zoneLabel={zone} />}
      width="wide"
    >
      {error ? (
        <EmptyState
          icon={<CalendarDays className="size-8" />}
          title="Agenda belum aktif"
          description={
            isSchemaOutdatedError(error) ? SCHEMA_OUTDATED_MESSAGE : "Agenda gagal dimuat. Coba muat ulang."
          }
        />
      ) : result.rows.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-8" />}
          title="Belum ada acara"
          description="Tambahkan acara pertama; pengunjung bisa menyimpannya ke kalender."
          action={<EventDialog zoneLabel={zone} />}
        />
      ) : (
        <AdminList label="Acara">
          {result.rows.map((event, index) => {
            const tile = eventDateTile(event.starts_at);
            const phase = PHASE[eventPhase(event, fetchedAt)];
            return (
              <AdminRow
                key={event.id}
                index={index}
                leading={<LeadingDate day={tile.day} month={tile.month} muted={phase === PHASE.past} />}
                title={event.title}
                badges={
                  <>
                    <StatusBadge tone={phase.tone} live={phase === PHASE.ongoing}>
                      {phase.label}
                    </StatusBadge>
                    {!event.is_published && <StatusBadge tone="outline">Draf</StatusBadge>}
                  </>
                }
                meta={`${formatEventSchedule(event.starts_at, event.ends_at)}${event.location ? ` · ${event.location}` : ""}`}
                actions={
                  <>
                    {event.is_published && (
                      <IconLink
                        href={eventPagePath(event.id)}
                        target="_blank"
                        label="Lihat di halaman Agenda"
                        icon={ExternalLink}
                      />
                    )}
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
                    <DeleteAction
                      action={deleteEvent}
                      id={event.id}
                      title={`Hapus acara "${event.title}"?`}
                      message="Album yang terhubung tetap ada."
                      successMessage="Acara dihapus"
                    />
                  </>
                }
              />
            );
          })}
        </AdminList>
      )}
      <Pagination
        basePath={adminFeatureHref("agenda")}
        current={result.page}
        total={result.totalPages}
      />
    </AdminPage>
  );
}
