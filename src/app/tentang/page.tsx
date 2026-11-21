import type { Metadata } from "next";
import {
  ArrowUpRight,
  AtSign,
  Compass,
  ListChecks,
  Mail,
  MapPin,
  Phone,
  Quote,
} from "lucide-react";
import {
  getApprovedMediaCount,
  getMembers,
  getPublishedPostCount,
  getSettings,
} from "@/lib/data";
import { eventMapsUrl } from "@/lib/agenda/calendar";
import { PageShell } from "@/components/public/page-shell";
import { ShareButton } from "@/components/public/share-save";
import { SiteColophon } from "@/components/public/site-colophon";
import { SiteIdentityCard } from "@/components/public/site-identity-card";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { SectionHeader } from "@/components/ui/section-header";
import { MemberCard } from "@/components/public/member-card";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import {
  getContentLabels,
  SOCIAL_NETWORKS,
  toDisplayLabel,
} from "@/lib/site-config";
import { blurDelay, listReveal } from "@/components/motion";
import { cn } from "@/lib/utils/cn";

export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), PUBLIC_PAGE_SEO.tentang);
}

function formatSocialDisplay(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const path = parsed.pathname.replace(/\/+$/, "");
    if (path && path !== "/") {
      const seg = path.slice(1);
      if (!seg.includes("/")) return seg.startsWith("@") ? seg : `@${seg}`;
      return `${parsed.hostname.replace(/^www\./, "")}${path}`;
    }
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return rawUrl;
  }
}

const CONTACT_TILE_CLASS =
  "border-border/80 bg-surface hover:border-primary/25 hover:shadow-soft flex items-center justify-between gap-2 rounded-2xl border p-3 transition-all";

function toTelHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

export default async function TentangPage() {
  const [settings, members, mediaCount, postCount] = await Promise.all([
    getSettings(),
    getMembers(),
    getApprovedMediaCount(),
    getPublishedPostCount(),
  ]);
  const coreMembers = members.filter((member) => member.is_pengurus);
  const labels = getContentLabels(settings);
  const memberPlural = toDisplayLabel(labels.memberPlural, settings.locale);
  const socialLinks = SOCIAL_NETWORKS.flatMap((network) => {
    const url = settings.social?.[network.key];
    return url ? [{ ...network, url }] : [];
  });
  const hasContact =
    socialLinks.length > 0 ||
    settings.contact_email ||
    settings.contact_phone ||
    settings.contact_address;

  const stats = [
    { label: memberPlural, value: members.length },
    { label: "Pin Galeri", value: mediaCount },
    { label: "Artikel", value: postCount },
  ];

  const hasVision = Boolean(settings.visi);
  const hasMissions = Boolean(settings.misi && settings.misi.length > 0);

  return (
    <PageShell
      header={{
        variant: "sub",
        title: `Tentang ${settings.site_name}`,
        backHref: "/profil",
        right: <ShareButton title={`Tentang ${settings.site_name}`} />,
      }}
    >
      <JsonLd
        data={breadcrumbStructuredData(settings, [
          { name: "Beranda", path: "/" },
          { name: `Tentang ${settings.site_name}`, path: "/tentang" },
        ])}
      />

      <div className="space-y-8">
        {/* Banner Identitas Heroik + Strip Statistik Terpadu */}
        <SiteIdentityCard
          name={settings.site_name}
          logoUrl={settings.logo_url}
          logoSize={88}
          titleId="about-site-title"
          stats={stats}
        >
          {settings.tagline && (
            <p
              className="text-primary-readable motion-blur-in mx-auto mt-1.5 max-w-lg text-subhead font-semibold"
              style={blurDelay(150)}
            >
              {settings.tagline}
            </p>
          )}
          {settings.description && (
            <p
              className="text-muted motion-blur-in mx-auto mt-2 max-w-xl text-sm leading-relaxed text-balance"
              style={blurDelay(210)}
            >
              {settings.description}
            </p>
          )}
        </SiteIdentityCard>

        {/* Bento 2-Kolom Visi & Misi */}
        {(hasVision || hasMissions) && (
          <div
            className={cn(
              "grid gap-4",
              hasVision && hasMissions && "md:grid-cols-2",
            )}
          >
            {hasVision && (
              <Card
                data-spotlight
                className="relative flex flex-col justify-between overflow-hidden p-6"
              >
                <span
                  aria-hidden="true"
                  className="aurora pointer-events-none absolute inset-0"
                />
                <Quote
                  aria-hidden="true"
                  className="text-primary/[0.08] pointer-events-none absolute right-5 top-5 size-12"
                />
                <div className="relative">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="bg-primary/14 text-primary-readable grid size-9 shrink-0 place-items-center rounded-xl"
                      aria-hidden="true"
                    >
                      <Compass className="size-4.5" />
                    </span>
                    <div>
                      <p className="text-primary-readable text-caption2 font-bold uppercase tracking-wider">
                        Arah Kami
                      </p>
                      <h2 className="font-display text-lg font-bold leading-tight">
                        Visi / Tujuan
                      </h2>
                    </div>
                  </div>
                  <p className="font-display mt-5 text-title3 font-semibold leading-snug tracking-tight text-balance sm:text-title2">
                    “{settings.visi}”
                  </p>
                </div>
              </Card>
            )}

            {hasMissions && settings.misi && (
              <Card data-spotlight className="relative overflow-hidden p-6">
                <div className="flex items-center gap-2.5">
                  <span
                    className="bg-tone-teal/15 text-tone-teal-text grid size-9 shrink-0 place-items-center rounded-xl"
                    aria-hidden="true"
                  >
                    <ListChecks className="size-4.5" />
                  </span>
                  <div>
                    <p className="text-tone-teal-text text-caption2 font-bold uppercase tracking-wider">
                      Langkah Nyata
                    </p>
                    <h2 className="font-display text-lg font-bold leading-tight">
                      Misi / Prinsip
                    </h2>
                  </div>
                </div>
                <ol className="divide-border/55 mt-4 divide-y">
                  {settings.misi.map((mission, idx) => (
                    <li
                      key={mission}
                      className="flex items-start gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
                    >
                      <span className="border-primary/20 bg-primary/12 text-primary-readable mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[0.68rem] font-bold tabular-nums">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-muted leading-relaxed">
                        {mission}
                      </span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}
          </div>
        )}

        {/* Pengurus / Tim Inti */}
        {coreMembers.length > 0 && (
          <section aria-labelledby="about-core">
            <SectionHeader
              id="about-core"
              eyebrow="Penggerak"
              title={toDisplayLabel(labels.memberCoreGroup, settings.locale)}
              count={coreMembers.length}
              actionHref="/anggota"
              actionLabel={`Semua ${labels.memberPlural}`}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {coreMembers.map((member, index) => (
                <div key={member.id} {...listReveal(index)} className="h-full">
                  <MemberCard member={member} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Kartu Kontak Bento 2-Kolom */}
        {hasContact && (
          <section aria-labelledby="about-contact">
            <SectionHeader
              id="about-contact"
              eyebrow="Terhubung"
              title="Kontak & Kanal"
            />
            <div className="grid gap-2.5 sm:grid-cols-2">
              {socialLinks.map((social) => (
                <a
                  key={social.key}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    CONTACT_TILE_CLASS,
                    "gap-3",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <ContactIcon icon={<AtSign className="h-4 w-4" />} />
                    <ContactText
                      label={social.label}
                      value={formatSocialDisplay(social.url)}
                    />
                  </span>
                  <ArrowUpRight
                    className="text-muted size-4 shrink-0"
                    aria-hidden="true"
                  />
                </a>
              ))}

              {settings.contact_email && (
                <div className={CONTACT_TILE_CLASS}>
                  <a
                    href={`mailto:${settings.contact_email}`}
                    className="flex min-w-0 flex-1 items-center gap-3 hover:underline"
                  >
                    <ContactIcon icon={<Mail className="h-4 w-4" />} />
                    <ContactText label="Email" value={settings.contact_email} />
                  </a>
                  <CopyButton
                    value={settings.contact_email}
                    size="xs"
                    label="Salin email"
                    successMessage="Email disalin"
                  />
                </div>
              )}

              {settings.contact_phone && (
                <div className={CONTACT_TILE_CLASS}>
                  <a
                    href={toTelHref(settings.contact_phone)}
                    className="flex min-w-0 flex-1 items-center gap-3 hover:underline"
                  >
                    <ContactIcon icon={<Phone className="h-4 w-4" />} />
                    <ContactText
                      label="Telepon"
                      value={settings.contact_phone}
                    />
                  </a>
                  <CopyButton
                    value={settings.contact_phone}
                    size="xs"
                    label="Salin nomor telepon"
                    successMessage="Nomor telepon disalin"
                  />
                </div>
              )}

              {settings.contact_address && (
                <div className={cn(CONTACT_TILE_CLASS, "sm:col-span-2")}>
                  <a
                    href={eventMapsUrl(settings.contact_address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-3 hover:underline"
                  >
                    <ContactIcon icon={<MapPin className="h-4 w-4" />} />
                    <ContactText
                      label="Alamat (buka peta)"
                      value={settings.contact_address}
                    />
                  </a>
                  <CopyButton
                    value={settings.contact_address}
                    size="xs"
                    label="Salin alamat"
                    successMessage="Alamat disalin"
                  />
                </div>
              )}
            </div>
          </section>
        )}

        <SiteColophon
          siteName={settings.site_name}
          footerText={settings.footer_text}
          className="mt-2"
        />
      </div>
    </PageShell>
  );
}

function ContactIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <span className="bg-surface text-primary-readable grid h-9 w-9 shrink-0 place-items-center rounded-xl shadow-2xs">
      {icon}
    </span>
  );
}

function ContactText({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0">
      <span className="text-muted block text-caption2 font-semibold uppercase tracking-wide">
        {label}
      </span>
      <span className="block break-words text-sm font-semibold">{value}</span>
    </span>
  );
}
