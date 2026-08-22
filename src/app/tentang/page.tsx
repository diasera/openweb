import type { Metadata } from "next";
import { AtSign, Mail, MapPin, Phone } from "lucide-react";
import { getSettings, getMembers } from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { SiteLogo } from "@/components/public/site-logo";
import { Card } from "@/components/ui/card";
import { MemberCard } from "@/components/public/member-card";
import { buildPageMetadata, PUBLIC_PAGE_SEO } from "@/lib/seo";
import { breadcrumbStructuredData } from "@/lib/seo/structured-data";
import { JsonLd } from "@/components/seo/json-ld";
import {
  getContentLabels,
  SOCIAL_NETWORKS,
  toDisplayLabel,
} from "@/lib/site-config";

export const revalidate = 30;

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata(await getSettings(), PUBLIC_PAGE_SEO.tentang);
}

export default async function TentangPage() {
  const [settings, members] = await Promise.all([getSettings(), getMembers()]);
  const coreMembers = members.filter((member) => member.is_pengurus);
  const labels = getContentLabels(settings);
  const socialLinks = SOCIAL_NETWORKS.flatMap((network) => {
    const url = settings.social?.[network.key];
    return url ? [{ ...network, url }] : [];
  });
  const hasContact =
    socialLinks.length > 0 ||
    settings.contact_email ||
    settings.contact_phone ||
    settings.contact_address;

  return (
    <PageShell
      header={{
        variant: "sub",
        title: `Tentang ${settings.site_name}`,
        backHref: "/profil",
      }}
    >
      <JsonLd
        data={breadcrumbStructuredData(settings, [
          { name: "Beranda", path: "/" },
          { name: `Tentang ${settings.site_name}`, path: "/tentang" },
        ])}
      />
      <div className="space-y-4">
        <Card className="p-5 text-center">
          <div className="flex justify-center">
            <SiteLogo name={settings.site_name} url={settings.logo_url} size={64} />
          </div>
          <h1 className="font-display mt-3 text-xl font-bold">{settings.site_name}</h1>
          {settings.description && (
            <p className="text-muted mt-1 text-sm">{settings.description}</p>
          )}
          {settings.tagline && <p className="mt-2 text-sm">{settings.tagline}</p>}
        </Card>

        {settings.visi && (
          <Card className="p-5">
            <h2 className="font-display font-bold">Visi / tujuan</h2>
            <p className="text-muted mt-2 text-sm leading-relaxed">{settings.visi}</p>
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
              {coreMembers.map((member) => (
                <MemberCard key={member.id} member={member} />
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
                  rel="noreferrer"
                  className="flex items-center gap-3"
                >
                  <ContactIcon icon={<AtSign className="h-4 w-4" />} />
                  <ContactText label={social.label} value={social.url} />
                </a>
              ))}
              {settings.contact_email && (
                <div className="flex items-center gap-3">
                  <ContactIcon icon={<Mail className="h-4 w-4" />} />
                  <ContactText label="Email" value={settings.contact_email} />
                </div>
              )}
              {settings.contact_phone && (
                <div className="flex items-center gap-3">
                  <ContactIcon icon={<Phone className="h-4 w-4" />} />
                  <ContactText label="Telepon" value={settings.contact_phone} />
                </div>
              )}
              {settings.contact_address && (
                <div className="flex items-center gap-3">
                  <ContactIcon icon={<MapPin className="h-4 w-4" />} />
                  <ContactText label="Alamat" value={settings.contact_address} />
                </div>
              )}
            </div>
          </Card>
        )}
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
      <span className="block break-all font-medium">{value}</span>
    </span>
  );
}
