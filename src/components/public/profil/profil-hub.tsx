import { ArrowUpRight, ChevronRight, LockKeyhole } from "lucide-react";
import { ADMIN_AUTH_PATHS } from "@/lib/constants";
import { cn } from "@/lib/utils/cn";
import { MotionLink, blurDelay, listReveal } from "@/components/motion";
import {
  DESTINATION_ICONS,
  type Destination,
} from "@/components/public/destination-icons";
import { PageShell } from "@/components/public/page-shell";
import { SiteColophon } from "@/components/public/site-colophon";
import { SiteIdentityCard } from "@/components/public/site-identity-card";
import { cardClass } from "@/components/ui/card";
import { IconPlate } from "@/components/ui/icon-plate";
import { SectionHeader } from "@/components/ui/section-header";
import { ProfilPreferences } from "./profil-preferences";

/** Kelas tone ditulis literal agar terbaca pemindai Tailwind. */
const DESTINATIONS: ReadonlyArray<{
  href: Destination;
  label: string;
  description: string;
  plate: string;
  featured?: boolean;
  wide?: boolean;
}> = [
  {
    href: "/galeri",
    label: "Galeri",
    description: "Foto & video terbaru dari semua kegiatan",
    plate: "bg-tone-blue text-white",
    featured: true,
  },
  { href: "/blog", label: "Blog", description: "Artikel & kabar", plate: "bg-tone-teal text-white" },
  { href: "/agenda", label: "Agenda", description: "Jadwal kegiatan", plate: "bg-tone-orange text-white" },
  { href: "/album", label: "Album", description: "Koleksi per acara", plate: "bg-tone-indigo text-white" },
  { href: "/kilas-balik", label: "Kilas Balik", description: "Rangkuman perjalanan", plate: "bg-primary text-primary-foreground", wide: true },
  { href: "/anggota", label: "Anggota", description: "Kenali semuanya", plate: "bg-tone-green text-white" },
  { href: "/pesan", label: "Pesan Anonim", description: "Kirim tanpa nama", plate: "bg-tone-purple text-white" },
  { href: "/tersimpan", label: "Tersimpan", description: "Pin & artikel favoritmu", plate: "bg-tone-pink text-white" },
  { href: "/tentang", label: "Tentang", description: "Visi, misi, dan kontak", plate: "bg-tone-cyan text-white" },
  { href: "/privasi", label: "Privasi", description: "Data & cookie", plate: "bg-tone-gray text-white" },
];

export interface ProfilHubProps {
  siteName: string;
  logoUrl: string | null;
  tagline: string | null;
  description: string | null;
  footerText: string | null;
  memberLabel: string;
  stats: { members: number; media: number; posts: number };
  initialBell: boolean;
}

/**
 * Tab Profil untuk pengunjung: kartu identitas bercahaya (logo bercincin,
 * nama masuk per kata, angka yang menghitung naik), peta jelajah bento
 * bersorot kursor, preferensi perangkat, lalu pintu masuk admin yang tenang.
 */
export function ProfilHub({
  siteName,
  logoUrl,
  tagline,
  description,
  footerText,
  memberLabel,
  stats,
  initialBell,
}: ProfilHubProps) {
  const statItems = [
    { value: stats.members, label: memberLabel },
    { value: stats.media, label: "Pin" },
    { value: stats.posts, label: "Artikel" },
  ];
  const lead = tagline || description;

  return (
    <PageShell header={{ variant: "title", title: "Profil" }}>
      <div className="space-y-9">
        {/* ---- Identitas -------------------------------------------------- */}
        <SiteIdentityCard
          name={siteName}
          logoUrl={logoUrl}
          logoSize={96}
          titleId="profil-title"
          stats={statItems}
        >
          {lead && (
            <p
              className="text-muted motion-blur-in mx-auto mt-1.5 max-w-md text-subhead text-balance"
              style={blurDelay(200)}
            >
              {lead}
            </p>
          )}
        </SiteIdentityCard>

        {/* ---- Jelajahi --------------------------------------------------- */}
        <section aria-labelledby="profil-explore">
          <SectionHeader id="profil-explore" eyebrow="Jelajahi" title="Semua ruang" />
          <ul className="grid grid-flow-dense grid-cols-2 gap-3 sm:grid-cols-3">
            {DESTINATIONS.map((item, index) => {
              const Icon = DESTINATION_ICONS[item.href];
              const label = item.href === "/anggota" ? memberLabel : item.label;
              const reveal = listReveal(index);
              const highlight = Boolean(item.featured || item.wide);
              return (
                <li
                  key={item.href}
                  style={reveal.style}
                  className={cn(
                    reveal.className,
                    item.featured && "col-span-2 sm:col-span-1 sm:row-span-2",
                    item.wide && "col-span-2",
                  )}
                >
                  <MotionLink
                    href={item.href}
                    data-spotlight
                    className={cardClass(
                      "interactive",
                      cn(
                        "group relative flex h-full flex-col justify-between overflow-hidden p-4",
                        item.featured ? "min-h-36 sm:min-h-full" : "min-h-32",
                      ),
                    )}
                  >
                    {highlight && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "liquid-gradient pointer-events-none absolute inset-0 transition-opacity duration-500",
                          item.featured
                            ? "opacity-[0.14] group-hover:opacity-24"
                            : "opacity-[0.1] group-hover:opacity-18",
                        )}
                      />
                    )}
                    <div className="relative flex items-start justify-between gap-2">
                      <IconPlate
                        icon={Icon}
                        size={item.featured ? "lg" : "md"}
                        className={item.plate}
                      />
                      <ArrowUpRight
                        className="text-muted size-4.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="relative mt-4">
                      <p
                        className={cn(
                          "font-display font-bold",
                          item.featured ? "text-title2" : "text-body",
                        )}
                      >
                        {label}
                      </p>
                      <p className="text-muted mt-0.5 text-caption1 leading-snug sm:text-footnote">
                        {item.description}
                      </p>
                    </div>
                  </MotionLink>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ---- Preferensi ------------------------------------------------- */}
        <section aria-labelledby="profil-preferences" className="motion-reveal">
          <SectionHeader
            id="profil-preferences"
            eyebrow="Perangkat ini"
            title="Preferensi"
            subtitle="Tersimpan di perangkat ini saja, tanpa akun."
          />
          <ProfilPreferences initialBell={initialBell} />
        </section>

        {/* ---- Pintu admin ------------------------------------------------ */}
        <MotionLink
          href={ADMIN_AUTH_PATHS.login}
          className={cardClass(
            "flat",
            "group motion-pressable border-border/75 bg-surface/75 flex items-center gap-3 p-4 transition-colors hover:bg-surface",
          )}
        >
          <span className="bg-foreground text-bg grid size-10 place-items-center rounded-xl">
            <LockKeyhole className="size-4.5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Masuk sebagai admin</span>
            <span className="text-muted block text-caption1">
              Khusus pengelola {siteName}
            </span>
          </span>
          <ChevronRight
            className="text-muted size-4.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </MotionLink>

        <SiteColophon siteName={siteName} footerText={footerText} />
      </div>
    </PageShell>
  );
}
