import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getMemberByProfileKey, getSettings } from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { ShareButton } from "@/components/public/share-save";
import { MemberProfileCard } from "@/components/public/member-profile-card";
import { MemberHeatmap } from "@/components/public/member-heatmap";
import { getMemberActivity } from "@/lib/members/activity";
import { memberProfilePath } from "@/lib/members/slug";
import { getContentLabels, toDisplayLabel } from "@/lib/site-config";
import { MemberActivityFeed } from "@/components/public/member-activity-feed";
import { JsonLd } from "@/components/seo/json-ld";
import { buildPageMetadata, plainText } from "@/lib/seo";
import {
  breadcrumbStructuredData,
  profileStructuredData,
} from "@/lib/seo/structured-data";

export const revalidate = 30;

type MemberProfileParams = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: MemberProfileParams): Promise<Metadata> {
  const { slug } = await params;
  const [member, settings] = await Promise.all([
    getMemberByProfileKey(slug),
    getSettings(),
  ]);
  const labels = getContentLabels(settings);
  const title = member
    ? `${member.name}${member.position ? ` — ${member.position}` : ""}`
    : `Profil ${labels.memberSingular}`;
  return buildPageMetadata(settings, {
    title,
    description:
      plainText(member?.bio, 170) ||
      (member
        ? `Profil dan riwayat karya ${member.name} di ${settings.site_name}.`
        : `Profil ${labels.memberSingular} tidak ditemukan.`),
    path: member ? memberProfilePath(member) : `/profil/${slug}`,
    // Tanpa foto pribadi, kartu sosial anggota dirender otomatis /api/og.
    image: member?.photo_url ?? (member ? `/api/og/anggota/${member.slug}` : undefined),
    noIndex: !member,
  });
}

export default async function MemberProfilePage({
  params,
}: MemberProfileParams) {
  const { slug } = await params;
  const [member, settings] = await Promise.all([
    getMemberByProfileKey(slug),
    getSettings(),
  ]);
  if (!member) notFound();

  const canonicalPath = memberProfilePath(member);
  if (slug !== member.slug) permanentRedirect(canonicalPath);

  const [activity, labels] = [
    await getMemberActivity(member),
    getContentLabels(settings),
  ];
  const mediaCount = activity.filter((item) => item.kind === "media").length;
  const blogCount = activity.filter((item) => item.kind === "blog").length;

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
            {
              name: toDisplayLabel(labels.memberPlural, settings.locale),
              path: "/anggota",
            },
            { name: member.name, path: canonicalPath },
          ]),
        ]}
      />
      <MemberProfileCard
        member={member}
        settings={settings}
        mediaCount={mediaCount}
        blogCount={blogCount}
      />

      <div className="mx-auto mt-3 w-full max-w-2xl">
        <MemberHeatmap
          items={activity}
          memberLabel={toDisplayLabel(labels.memberSingular, settings.locale)}
        />
      </div>

      <MemberActivityFeed
        memberName={member.name}
        memberLabel={toDisplayLabel(labels.memberSingular, settings.locale)}
        items={activity}
      />
    </PageShell>
  );
}
