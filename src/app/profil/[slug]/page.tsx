import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getMemberByProfileKey, getSettings } from "@/lib/data";
import { PageShell } from "@/components/public/page-shell";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
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
    image: member?.photo_url,
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

  const activity = await getMemberActivity(member);
  const labels = getContentLabels(settings);

  return (
    <PageShell
      header={{
        variant: "sub",
        title: member.name,
        backHref: "/anggota",
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
      <div className="mx-auto max-w-md text-center">
        <div className="flex justify-center">
          <Avatar name={member.name} src={member.photo_url} size={110} ring />
        </div>
        <h1 className="font-display mt-4 text-2xl font-bold">{member.name}</h1>
        {member.position && (
          <div className="mt-2 flex justify-center">
            <Chip variant="role">{member.position}</Chip>
          </div>
        )}
        {member.nim && (
          <p className="text-muted mt-2 text-sm">
            {labels.memberIdentifier}: {member.nim}
          </p>
        )}
        {member.bio && (
          <p className="mt-4 text-sm leading-relaxed">{member.bio}</p>
        )}
      </div>
      <MemberActivityFeed memberName={member.name} items={activity} />
    </PageShell>
  );
}
