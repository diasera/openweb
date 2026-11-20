import type { Metadata } from "next";
import { ArrowUpRight, AtSign, Mail, MapPin, Phone } from "lucide-react";
import {
  getApprovedMediaCount,
  getMembers,
  getPublishedPostCount,
  getSettings,
} from "@/lib/data";
import { eventMapsUrl } from "@/lib/agenda/calendar";
import { PageShell } from "@/components/public/page-shell";
import { ShareButton } from "@/components/public/share-save";
import { SiteIdentityCard } from "@/components/public/site-identity-card";
import { SiteColophon } from "@/components/public/site-colophon";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { CountUp } from "@/components/ui/count-up";
import { MemberCard } from "@/components/public/member-card";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import {
  getContentLabels,
  SOCIAL_NETWORKS,
  toDisplayLabel,
} from "@/lib/site-config";
import { listReveal } from "@/components/motion";

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
      <div className="space-y-4">
        <SiteIdentityCard
          name={settings.site_name}
          logoUrl={settings.logo_url}
          logoSize={64}
        >
          {settings.description && (
            <p className="text-muted mt-1 text-sm">{settings.description}</p>
          )}
          {settings.tagline && <p className="mt-2 text-sm">{settings.tagline}</p>}
        </SiteIdentityCard>

        <dl className="grid grid-cols-3 gap-2.5">
          {stats.map((item) => (
            <Card key={item.label} className="flex flex-col-reverse p-3.5 text-center">
              <dt className="text-muted truncate text-caption1 font-medium">
                {item.label}
              </dt>
              <dd className="font-display text-title2 font-bold tabular-nums">
                <CountUp value={item.value} />
              </dd>
            </Card>
          ))}
        </dl>

        {settings.visi && (
          <Card className="p-5">
            <h2 className="font-display font-bold">Visi / tujuan</h2>
            <p className="text-muted mt-2 text-sm leading-relaxed">
              {settings.visi}
            </p>
          </Card>
        )}

        {settings.misi && settings.misi.length > 0 && (
          <Card className="p-5">
            <h2 className="font-display font-bold">Misi / prinsip</h2>
            <ul className="mt-2 space-y-2">
              {settings.misi.map((mission) => (
                <li key={mission} className="flex gap-2.5 text-sm">
                  <span className="bg-primary mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" />
                  <span className="text-muted leading-relaxed">{mission}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {coreMembers.length > 0 && (
          <section>
            <h2 className="font-display mb-3 font-bold">
              {toDisplayLabel(labels.memberCoreGroup, settings.locale)}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {coreMembers.map((member, index) => (
                <div key={member.id} {...listReveal(index)}>
                  <MemberCard member={member} />
                </div>
              ))}
            </div>
          </section>
        )}

        {hasContact && (
          <Card className="p-5">
            <h2 className="font-display mb-3 font-bold">Kontak</h2>
            <div className="space-y-3">
              {socialLinks.map((social) => (
                <a
                  key={social.key}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:bg-surface-2/60 -mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 transition-colors"
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
                <div className="flex items-center justify-between gap-3">
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
                <div className="flex items-center justify-between gap-3">
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
                <div className="flex items-center justify-between gap-3">
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
          </Card>
        )}

        <SiteColophon
          siteName={settings.site_name}
          footerText={settings.footer_text}
          className="pt-6"
        />
      </div>
    </PageShell>
  );
}

function ContactIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <span className="bg-surface-2 text-muted grid h-9 w-9 shrink-0 place-items-center rounded-xl">
      {icon}
    </span>
  );
}

function ContactText({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0">
      <span className="text-muted block text-xs">{label}</span>
      <span className="block break-words font-medium">{value}</span>
    </span>
  );
}
