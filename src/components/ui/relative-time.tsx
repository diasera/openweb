"use client";

import { useNow } from "@/lib/hooks/use-now";
import { formatSiteDate, timeAgo } from "@/lib/utils/time";

const MINUTE = 60_000;

/**
 * Label waktu relatif ("2 jam lalu") yang aman untuk halaman ISR dan Client
 * Component. Server serta pass hidrasi menampilkan tanggal absolut zona situs
 * (deterministik), lalu browser beralih ke label relatif yang ikut diperbarui
 * tiap menit — tidak pernah beku di cache dan tidak pernah mismatch.
 */
export function RelativeTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const now = useNow(MINUTE);
  return (
    <time dateTime={iso} title={formatSiteDate(iso)} className={className}>
      {now === null ? formatSiteDate(iso) : timeAgo(iso, now)}
    </time>
  );
}
