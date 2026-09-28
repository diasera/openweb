import { getSettings } from "@/lib/data";
import { normalizeAdsenseClientId } from "@/lib/seo";

export const revalidate = 3600;

export async function GET() {
  const settings = await getSettings();
  const clientId = normalizeAdsenseClientId(settings.google_adsense_client_id);
  const body = clientId
    ? `google.com, ${clientId.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`
    : "# Google AdSense belum dikonfigurasi.\n";
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
