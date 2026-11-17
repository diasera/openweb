import { NextResponse } from "next/server";
import { getSettings } from "@/lib/data";
import { SHARE_TARGET } from "@/lib/pwa/share-target";
import { toAbsoluteSiteUrl } from "@/lib/site-config";

/**
 * Cadangan bila service worker belum aktif saat berbagi dari galeri HP:
 * file tidak bisa dititipkan, jadi arahkan ke Buat Pin pada origin kanonis situs.
 */
export async function POST() {
  const settings = await getSettings();
  const target = toAbsoluteSiteUrl(
    `/buat?${SHARE_TARGET.resultParam}=gagal`,
    settings,
  );
  return NextResponse.redirect(target, 303);
}
