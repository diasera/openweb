import { Avatar } from "@/components/ui/avatar";
import { CopyButton } from "@/components/ui/copy-button";
import { SiteIdentityCard } from "@/components/public/site-identity-card";
import {
  MemberAvatarZoom,
  MemberPassButton,
} from "@/components/public/profil/member-pass-modal";
import { SharedMorph, blurDelay } from "@/components/motion";
import { getContentLabels, toDisplayLabel } from "@/lib/site-config";
import { formatSiteDate } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";
import type { MemberRow, SiteSettingsRow } from "@/lib/types/database";

/**
 * Kartu identitas anggota berbasis cangkang bersama `SiteIdentityCard` (Pola
 * Sarang Laba-Laba): avatar besar bercincin (ketuk untuk perbesar), peran,
 * nomor identitas dengan salin cepat, bio, strip angka, & Kartu ID 3D.
 */
export function MemberHero({
  member,
  settings,
  mediaCount,
  blogCount,
  profileUrl,
}: {
  member: MemberRow;
  settings: SiteSettingsRow;
  mediaCount: number;
  blogCount: number;
  profileUrl?: string;
}) {
  const labels = getContentLabels(settings);
  const role =
    member.position ||
    (member.is_pengurus ? toDisplayLabel(labels.memberCoreGroup) : null);
  const stats = [
    { label: "Media", value: mediaCount },
    { label: "Artikel", value: blogCount },
    {
      label: "Bergabung",
      value: member.created_at
        ? formatSiteDate(member.created_at, "monthYear")
        : "—",
      small: true,
    },
  ];

  return (
    <SiteIdentityCard
      name={member.name}
      titleId="member-name"
      compactBanner
      stats={stats}
      avatarSlot={
        <MemberAvatarZoom name={member.name} photoUrl={member.photo_url}>
          <SharedMorph name={`member-${member.slug}`}>
            <span
              className={cn(
                "animate-control-pop inline-block rounded-full",
                member.is_pengurus && "motion-ring-spin",
              )}
            >
              <Avatar
                name={member.name}
                src={member.photo_url}
                size={112}
                ring={member.is_pengurus}
                className="bg-surface rounded-full p-1"
              />
            </span>
          </SharedMorph>
        </MemberAvatarZoom>
      }
      footer={
        <div
          className="motion-blur-in mt-4 flex justify-center"
          style={blurDelay(420)}
        >
          <MemberPassButton
            variant="pill"
            data={{
              member,
              siteName: settings.site_name,
              roleLabel: role,
              identifierLabel: labels.memberIdentifier,
              profileUrl,
              mediaCount,
              blogCount,
            }}
          />
        </div>
      }
    >
      {(role || member.nim) && (
        <div
          className="motion-blur-in mt-2 flex flex-wrap items-center justify-center gap-1.5"
          style={blurDelay(160)}
        >
          {role && (
            <span
              className={cn(
                "rounded-full px-3 py-1 text-caption1 font-semibold",
                member.is_pengurus
                  ? "gloss bg-primary text-primary-foreground"
                  : "border-border/75 bg-surface-2 border",
              )}
            >
              {role}
            </span>
          )}
          {member.nim && (
            <span className="border-border inline-flex items-center gap-1 rounded-full border py-0.5 pl-3 pr-1 font-mono text-caption1 text-muted">
              <span>{member.nim}</span>
              <CopyButton
                value={member.nim}
                size="xs"
                label={`Salin ${labels.memberIdentifier}`}
                successMessage={`${labels.memberIdentifier} disalin`}
                className="size-6 bg-transparent hover:bg-surface-2"
              />
            </span>
          )}
        </div>
      )}
      {member.bio && (
        <p
          className="motion-blur-in mx-auto mt-4 max-w-md text-subhead leading-relaxed text-balance"
          style={blurDelay(220)}
        >
          {member.bio}
        </p>
      )}
    </SiteIdentityCard>
  );
}
