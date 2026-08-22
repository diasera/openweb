"use client";

/**
 * Mock hasil pencarian Google untuk halaman depan. Judul & deskripsi efektif
 * dihitung ulang lewat pusat yang sama dengan render produksi (getHomeSeo*)
 * supaya pratinjau tidak pernah bohong.
 */
export function SerpPreview({
  siteName,
  siteUrl,
  title,
  description,
}: {
  siteName: string;
  siteUrl: string;
  title: string;
  description: string;
}) {
  let displayHost = siteUrl;
  try {
    displayHost = new URL(siteUrl).host;
  } catch {
    // Biarkan teks origin apa adanya.
  }
  return (
    <div
      className="bg-surface-2 border-border rounded-2xl border p-4"
      aria-label="Pratinjau hasil pencarian Google"
    >
      <div className="flex items-center gap-2.5">
        <span className="bg-primary/10 text-primary-readable grid h-7 w-7 place-items-center rounded-full text-xs font-bold">
          {siteName.trim().charAt(0).toLocaleUpperCase() || "·"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium">{siteName}</p>
          <p className="text-muted truncate text-xs">{displayHost}</p>
        </div>
      </div>
      <p className="mt-2 line-clamp-1 text-lg leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">
        {title}
      </p>
      <p className="text-muted mt-1 line-clamp-2 text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}
