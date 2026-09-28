import { ImageResponse } from "next/og";
import { getSettings } from "@/lib/data";
import { themePrimaryHex } from "@/lib/theme";

export const revalidate = 86400;

/**
 * Dimensi nyata tiap ikon harus sama dengan `sizes` di manifest. `glyph` adalah
 * rasio tinggi huruf terhadap kanvas; maskable menjaga konten di 60% tengah.
 * Badge notifikasi Android memakai kanal alfa saja: latar transparan, glyph putih.
 */
const ICONS: Record<string, { size: number; glyph: number; badge?: boolean }> = {
  "192": { size: 192, glyph: 0.49 },
  "512": { size: 512, glyph: 0.49 },
  maskable: { size: 512, glyph: 0.41 },
  badge: { size: 96, glyph: 0.72, badge: true },
};

/**
 * Ikon PWA (PNG 192/512 + maskable + badge notifikasi) dirender dari identitas
 * situs — latar token tema + inisial nama — memakai mesin ImageResponse yang
 * sama dengan kartu OG.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  const icon = ICONS[size];
  if (!icon) {
    return new Response("Ukuran ikon tidak dikenal.", { status: 404 });
  }

  const settings = await getSettings();
  const primary = themePrimaryHex(settings.theme);
  const initial =
    settings.site_name.trim().charAt(0).toLocaleUpperCase("id-ID") || "·";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: icon.badge ? "transparent" : primary,
          color: "#ffffff",
          fontFamily: "sans-serif",
          fontWeight: 700,
          fontSize: Math.round(icon.size * icon.glyph),
        }}
      >
        {initial}
      </div>
    ),
    { width: icon.size, height: icon.size },
  );
}
