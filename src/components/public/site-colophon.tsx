import { MotionLink } from "@/components/motion";
import { zonedParts } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";

const COLOPHON_LINKS = [
  { href: "/tentang", label: "Tentang" },
  { href: "/agenda", label: "Agenda" },
  { href: "/album", label: "Album" },
  { href: "/privasi", label: "Privasi" },
] as const;

/**
 * Kolofon situs: tautan halaman inti + "© tahun nama · teks footer". Satu
 * sumber untuk "Teks footer" di Pengaturan → Beranda: tahun dihitung otomatis
 * di zona waktu situs, jadi admin tidak perlu menulisnya. Tautan biasa
 * (`<a href>`) juga memberi mesin pencari jalur ke halaman yang dulu hanya
 * terjangkau dari tab Profil.
 */
export function SiteColophon({
  siteName,
  footerText,
  className,
}: {
  siteName: string;
  footerText?: string | null;
  className?: string;
}) {
  const year = zonedParts(new Date()).year;
  const text = footerText?.trim();
  const line = text?.includes("©")
    ? text
    : `© ${year} ${siteName}${text ? ` · ${text}` : ""}`;

  return (
    <footer className={cn("text-muted text-center text-caption1", className)}>
      <nav aria-label="Tautan situs" className="mb-2.5 flex flex-wrap justify-center gap-x-5 gap-y-1">
        {COLOPHON_LINKS.map((link) => (
          <MotionLink
            key={link.href}
            href={link.href}
            prefetch={false}
            className="hover:text-foreground font-medium transition-colors"
          >
            {link.label}
          </MotionLink>
        ))}
      </nav>
      <p className="text-balance">{line}</p>
    </footer>
  );
}
