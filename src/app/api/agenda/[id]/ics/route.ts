import { getEventById, getSettings } from "@/lib/data";
import { absoluteUrl } from "@/lib/seo";
import { slugify } from "@/lib/utils/slug";
import { buildIcs, eventPagePath } from "@/lib/agenda/calendar";

/** GET /api/agenda/:id/ics — unduh acara sebagai file kalender. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [event, settings] = await Promise.all([getEventById(id), getSettings()]);
  if (!event) return new Response("Acara tidak ditemukan.", { status: 404 });

  const ics = buildIcs(event, {
    siteName: settings.site_name,
    pageUrl: absoluteUrl(eventPagePath(event.id), settings),
  });
  const filename = `${slugify(event.title) || "acara"}.ics`;
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
