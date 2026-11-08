import { SiteLogo } from "@/components/public/site-logo";

/**
 * Mock satu hasil pencarian Google. Pemanggil mengirim judul & deskripsi yang
 * dihitung lewat pusat yang sama dengan render produksi (getHomeSeo*, judul
 * artikel), sehingga pratinjau tidak pernah berbeda dari yang dilihat Google.
 * Dipakai tab Identitas Pengaturan dan editor artikel.
 */
export function SerpPreview({
  siteName,
  logoUrl,
  url,
  title,
  description,
}: {
  siteName: string;
  logoUrl?: string | null;
  /** URL absolut halaman (origin + path). */
  url: string;
  title: string;
  description: string;
}) {
  let breadcrumb = url;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.split("/").filter(Boolean).join(" › ");
    breadcrumb = path ? `${parsed.origin} › ${path}` : parsed.origin;
  } catch {
    // Biarkan URL apa adanya.
  }

  return (
    <figure
      aria-label="Pratinjau hasil pencarian Google"
      className="border-border rounded-2xl border bg-white p-4 text-left text-[#202124] dark:bg-[#202124] dark:text-[#bdc1c6]"
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-[#f1f3f4] dark:bg-[#303134]">
          <SiteLogo name={siteName || "·"} url={logoUrl} size={26} />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[14px]">{siteName || "…"}</p>
          <p className="truncate text-[12px] text-[#4d5156] dark:text-[#9aa0a6]">{breadcrumb}</p>
        </div>
      </div>
      <p className="mt-2 line-clamp-1 text-[20px] leading-snug text-[#1a0dab] dark:text-[#99c3ff]">
        {title || "Judul halaman"}
      </p>
      <p className="mt-1 line-clamp-2 text-[14px] leading-[1.58] text-[#4d5156] dark:text-[#bdc1c6]">
        {description || "Deskripsi halaman akan tampil di sini."}
      </p>
      <figcaption className="sr-only">Perkiraan tampilan di Google</figcaption>
    </figure>
  );
}
