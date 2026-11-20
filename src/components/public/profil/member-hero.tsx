import { Avatar } from "@/components/ui/avatar";
import { cardClass } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { CountUp } from "@/components/ui/count-up";
import {
  MemberAvatarZoom,
  MemberPassButton,
} from "@/components/public/profil/member-pass-modal";
import { KineticWords, SharedMorph, blurDelay } from "@/components/motion";
import { getContentLabels, toDisplayLabel } from "@/lib/site-config";
import { formatSiteDate } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";
import type { MemberRow, SiteSettingsRow } from "@/lib/types/database";

/**
 * Kartu identitas anggota: banner mesh warna tema, avatar besar bercincin
 * (anggota inti berputar pelan, ketuk untuk perbesar), nama yang masuk per
 * kata, peran, nomor identitas dengan salin cepat, Kartu ID Holografik 3D,
 * bio, dan strip angka. Semua istilah mengikuti label konfigurasi admin.
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
  const role = member.position || (member.is_pengurus ? toDisplayLabel(labels.memberCoreGroup) : null);
  const stats = [
    { label: "Media", value: <CountUp value={mediaCount} /> },
    { label: "Artikel", value: <CountUp value={blogCount} /> },
    {
      label: "Bergabung",
      value: member.created_at ? formatSiteDate(member.created_at, "monthYear") : "—",
      small: true,
    },
  ];

  return (
    <section
      aria-labelledby="member-name"
      className={cardClass("elevated", "relative overflow-hidden rounded-[2rem] text-center")}
    >
      <div className="liquid-gradient grain relative h-32 sm:h-40" aria-hidden="true" />
      <div className="relative -mt-16 flex justify-center sm:-mt-[4.5rem]">
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
                size={120}
                ring={member.is_pengurus}
                className="bg-surface rounded-full p-1"
              />
            </span>
          </SharedMorph>
        </MemberAvatarZoom>
      </div>

      <div className="px-5 pb-6 pt-3 sm:px-10">
        <h1 id="member-name" className="font-display text-title1 font-bold tracking-tight sm:text-large-title">
          <KineticWords text={member.name} />
        </h1>
        {(role || member.nim) && (
          <div
            className="motion-blur-in mt-2 flex flex-wrap items-center justify-center gap-1.5"
            style={blurDelay(160)}
          >
            {role && (
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-caption1 font-semibold",
                  member.is_pengurus ? "gloss bg-primary text-primary-foreground" : "bg-surface-2",
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

        <dl className="mx-auto mt-6 grid max-w-md grid-cols-3 gap-2">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="bg-surface-2/70 border-border/60 motion-blur-in flex flex-col-reverse justify-center rounded-2xl border px-2 py-3"
              style={blurDelay(280 + index * 70)}
            >
              <dt className="text-muted text-caption1 font-medium">{stat.label}</dt>
              <dd
                className={cn(
                  "font-display font-bold",
                  stat.small ? "text-primary-readable text-footnote" : "text-title2",
                )}
              >
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>

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
      </div>
    </section>
  );
}
