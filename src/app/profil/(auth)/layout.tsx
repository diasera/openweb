import type { Metadata } from "next";
import { getApprovedMedia } from "@/lib/data";
import { optionalRead } from "@/lib/data/read";
import { AuthStage } from "@/components/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Jumlah pin untuk dinding gerbang; diulang per kolom bila situs masih sepi. */
const AUTH_WALL_LIMIT = 24;

/**
 * Panggung bersama login & setup owner. Dinding hanya dekorasi: bila data
 * gagal dibaca, gerbang tetap tampil dengan pin gradien.
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const media = await optionalRead(
    "auth-wall",
    () => getApprovedMedia({ limit: AUTH_WALL_LIMIT, slideCounts: false }),
    [],
  );
  return <AuthStage media={media}>{children}</AuthStage>;
}
