import { ImageResponse } from "next/og";
import { getSettings } from "@/lib/data";
import { rgbChannelsToHex } from "@/lib/theme";

export const revalidate = 86400;

const SIZES = new Set(["192", "512", "maskable"]);

/**
 * Ikon PWA (PNG 192/512 + maskable) dirender dari identitas situs —
 * latar token tema + inisial nama — memakai mesin ImageResponse yang sama
 * dengan kartu OG. Ukuran aman maskable: konten di 60% tengah.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  if (!SIZES.has(size)) {
    return new Response("Ukuran ikon tidak dikenal.", { status: 404 });
  }

  const settings = await getSettings();
  const primary = settings.theme?.primary
    ? rgbChannelsToHex(settings.theme.primary)
    : "#e60023";
  const initial =
    settings.site_name.trim().charAt(0).toLocaleUpperCase("id-ID") || "·";

  const fontSize = size === "maskable" ? 210 : 250;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: primary,
          color: "#ffffff",
          fontFamily: "sans-serif",
          fontWeight: 700,
          fontSize,
        }}
      >
        {initial}
      </div>
    ),
    { width: 512, height: 512 },
  );
}
