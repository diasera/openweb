import { Avatar } from "@/components/ui/avatar";
import { cardClass } from "@/components/ui/card";
import { CountUp } from "@/components/ui/count-up";
import { KineticWords, blurDelay } from "@/components/motion";
import { getContentLabels, toDisplayLabel } from "@/lib/site-config";
import { formatSiteDate } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";
import type { MemberRow, SiteSettingsRow } from "@/lib/types/database";

/**
 * Kartu identitas anggota: banner mesh warna tema, avatar besar bercincin
 * (anggota inti berputar pelan), nama yang masuk per kata, peran, nomor
 * identitas, bio, dan strip angka. Semua istilah mengikuti label konfigurasi
 * admin sehingga netral untuk jenis komunitas apa pun.
 */
export function MemberHero({
  member,
  settings,
  mediaCount,
  blogCount,
}: {
  member: MemberRow;
  settings: SiteSettingsRow;
  mediaCount: number;
  blogCount: number;
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
        <span
          className={cn("animate-control-pop rounded-full", member.is_pengurus && "motion-ring-spin")}
          style={{ viewTransitionName: `member-${member.slug}` }}
        >
          <Avatar
            name={member.name}
            src={member.photo_url}
            size={120}
            ring={member.is_pengurus}
            className="bg-surface rounded-full p-1"
          />
        </span>
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
              <span className="text-muted border-border rounded-full border px-3 py-1 font-mono text-caption1">
                {member.nim}
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
      </div>
    </section>
  );
}
