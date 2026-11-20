import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getMemberByProfileKey, getSettings } from "@/lib/data";
import { buildActivityHeatmap, getMemberActivity } from "@/lib/members/activity";
import { memberProfilePath } from "@/lib/members/slug";
import { getContentLabels, toDisplayLabel } from "@/lib/site-config";
import { absoluteUrl, buildPageMetadata, MEMBER_OG_CARD_PATH, plainText } from "@/lib/seo";
import {
  breadcrumbStructuredData,
  profileStructuredData,
} from "@/lib/seo/structured-data";
import { PageShell } from "@/components/public/page-shell";
import { ShareButton } from "@/components/public/share-save";
import { StoryShareButton } from "@/components/public/story-share-button";
import { MemberHero } from "@/components/public/profil/member-hero";
import { MemberActivityExplorer } from "@/components/public/profil/member-activity-explorer";
import { JsonLd } from "@/components/seo/json-ld";
import { formatSiteDate } from "@/lib/utils/time";

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
    image:
      member?.photo_url ??
      (member ? `${MEMBER_OG_CARD_PATH}/${member.slug}` : undefined),
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
  const initialHeatmap = buildActivityHeatmap(activity);
  const labels = getContentLabels(settings);
  const memberLabel = toDisplayLabel(labels.memberSingular, settings.locale);
  const mediaCount = activity.filter((item) => item.kind === "media").length;
  const blogCount = activity.length - mediaCount;
  const roleLabel =
    member.position ||
    (member.is_pengurus ? toDisplayLabel(labels.memberCoreGroup, settings.locale) : null);
  const profileUrl = absoluteUrl(canonicalPath, settings);

  return (
    <PageShell
      header={{
        variant: "sub",
        title: member.name,
        backHref: "/anggota",
        right: (
          <>
            <StoryShareButton
              variant="icon"
              spec={{
                kind: "member",
                siteName: settings.site_name,
                name: member.name,
                role: roleLabel,
                identifier: member.nim,
                bio: member.bio,
                joinedLabel: member.created_at
                  ? `Bergabung ${formatSiteDate(member.created_at, "monthYear")}`
                  : null,
                photoUrl: member.photo_url,
                qrUrl: profileUrl,
                filename: `kartu-${member.slug}`,
              }}
            />
            <ShareButton title={`Profil ${member.name}`} />
          </>
        ),
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
          profileUrl={profileUrl}
        />
        <MemberActivityExplorer
          initialHeatmap={initialHeatmap}
          items={activity}
          memberName={member.name}
          memberLabel={memberLabel}
        />
      </div>
    </PageShell>
  );
}
