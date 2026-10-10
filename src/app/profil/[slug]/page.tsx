import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getMemberByProfileKey, getSettings } from "@/lib/data";
import { getMemberActivity } from "@/lib/members/activity";
import { memberProfilePath } from "@/lib/members/slug";
import { getContentLabels, toDisplayLabel } from "@/lib/site-config";
import { buildPageMetadata, plainText } from "@/lib/seo";
import {
  breadcrumbStructuredData,
  profileStructuredData,
} from "@/lib/seo/structured-data";
import { PageShell } from "@/components/public/page-shell";
import { ShareButton } from "@/components/public/share-save";
import { MemberHero } from "@/components/public/profil/member-hero";
import { MemberHeatmap } from "@/components/public/profil/member-heatmap";
import { MemberTimeline } from "@/components/public/profil/member-timeline";
import { JsonLd } from "@/components/seo/json-ld";

export const revalidate = 30;

type MemberProfileParams = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: MemberProfileParams): Promise<Metadata> {
  const { slug } = await params;
  const [member, settings] = await Promise.all([getMemberByProfileKey(slug), getSettings()]);
  const labels = getContentLabels(settings);
  const title = member
    ? `${member.name}${member.position ? ` — ${member.position}` : ""}`
    : `Profil ${labels.memberSingular}`;
  return buildPageMetadata(settings, {
    title,
    description:
      plainText(member?.bio, 170) ||
      (member
        ? `Profil dan riwayat karya ${member.name}, ${labels.memberSingular} ${settings.site_name}.`
        : `Profil ${labels.memberSingular} tidak ditemukan.`),
    path: member ? memberProfilePath(member) : `/profil/${slug}`,
    // Tanpa foto pribadi, kartu sosial anggota dirender otomatis /api/og.
    image: member?.photo_url ?? (member ? `/api/og/anggota/${member.slug}` : undefined),
    noIndex: !member,
  });
}

/** Profil publik anggota: identitas, grafik aktivitas, dan linimasa tag. */
export default async function MemberProfilePage({ params }: MemberProfileParams) {
  const { slug } = await params;
  const [member, settings] = await Promise.all([getMemberByProfileKey(slug), getSettings()]);
  if (!member) notFound();

  // UUID lama atau slug sebelum ganti nama dialihkan permanen ke URL kanonis.
  const canonicalPath = memberProfilePath(member);
  if (slug !== member.slug) permanentRedirect(canonicalPath);

  const activity = await getMemberActivity(member);
  const labels = getContentLabels(settings);
  const memberLabel = toDisplayLabel(labels.memberSingular, settings.locale);
  const mediaCount = activity.filter((item) => item.kind === "media").length;
  const blogCount = activity.length - mediaCount;

  return (
    <PageShell
      header={{
        variant: "sub",
        title: member.name,
        backHref: "/anggota",
        right: <ShareButton title={`Profil ${member.name}`} />,
      }}
    >
      <JsonLd
        data={[
          profileStructuredData(settings, member, canonicalPath),
          breadcrumbStructuredData(settings, [
            { name: "Beranda", path: "/" },
            { name: toDisplayLabel(labels.memberPlural, settings.locale), path: "/anggota" },
            { name: member.name, path: canonicalPath },
          ]),
        ]}
      />
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <MemberHero
          member={member}
          settings={settings}
          mediaCount={mediaCount}
          blogCount={blogCount}
        />
        <MemberHeatmap items={activity} memberLabel={memberLabel} />
        <MemberTimeline memberName={member.name} memberLabel={memberLabel} items={activity} />
      </div>
    </PageShell>
  );
}
