import { Avatar } from "@/components/ui/avatar";
import { Card, cardClass } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { CountUp } from "@/components/ui/count-up";
import { getContentLabels, toDisplayLabel } from "@/lib/site-config";
import { cn } from "@/lib/utils/cn";
import type { MemberRow, SiteSettingsRow } from "@/lib/types/database";

/** Kartu identitas anggota: banner tema + avatar overlap + peran + bio.
 *  Semua istilah mengikuti label konfigurasi admin (template agnostik). */
export function MemberProfileCard({
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
  const joinedAt = member.created_at
    ? new Date(member.created_at).toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      })
    : null;

  const stats = [
    { label: "Media", value: mediaCount },
    { label: "Artikel", value: blogCount },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="motion-enter overflow-hidden">
        {/* Banner: pola diagonal lembut dari token tema — identitas visual
            yang bekerja untuk jenis komunitas apa pun. */}
        <div className="relative h-28 bg-surface-2 sm:h-32">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-90 [background:repeating-linear-gradient(135deg,rgb(var(--primary)/0.14)_0px,rgb(var(--primary)/0.14)_12px,rgb(var(--accent)/0.10)_12px,rgb(var(--accent)/0.10)_24px)]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 [background:radial-gradient(120%_180%_at_20%_-40%,rgb(255_255_255/0.22),transparent_55%)]"
          />
        </div>

        <div className="px-5 pb-6 text-center sm:px-8">
          <div
            className="relative mx-auto -mt-14 w-fit sm:-mt-16"
            style={{ viewTransitionName: `member-${member.slug}` }}
          >
            <Avatar
              name={member.name}
              src={member.photo_url}
              size={110}
              ring={member.is_pengurus}
              className="border-surface border-4"
            />
          </div>

          <h1 className="font-display mt-3 text-2xl font-bold leading-tight sm:text-3xl">
            {member.name}
          </h1>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            {member.position ? (
              <Chip
                variant={member.is_pengurus ? "primary" : "soft"}
                className={member.is_pengurus ? "" : "border border-border"}
              >
                {member.position}
              </Chip>
            ) : (
              member.is_pengurus && (
                <Chip variant="primary">
                {toDisplayLabel(labels.memberCoreGroup)}
              </Chip>
              )
            )}
            {member.nim && (
              <span className="text-muted rounded-full border border-border px-3 py-1 font-mono text-xs">
                {member.nim}
              </span>
            )}
          </div>

          {member.bio && (
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed">
              {member.bio}
            </p>
          )}
        </div>
      </Card>

      {/* Sel statistik singkat — angka menghitung naik saat terlihat. */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="motion-enter rounded-card border border-border bg-surface shadow-soft p-4 text-center"
            style={{ transitionDelay: `${(index + 1) * 90}ms` }}
          >
            <p className="font-display text-2xl font-bold">
              <CountUp value={stat.value} />
            </p>
            <p className="text-muted mt-0.5 text-xs font-medium">{stat.label}</p>
          </div>
        ))}
        <div
          className={cn(
            cardClass("elevated"),
            "motion-enter flex flex-col items-center justify-center p-4 text-center",
          )}
          style={{ transitionDelay: `${(stats.length + 1) * 90}ms` }}
        >
          <p className="text-primary-readable text-sm font-bold">
            {joinedAt ?? "—"}
          </p>
          <p className="text-muted mt-0.5 text-xs font-medium">Bergabung</p>
        </div>
      </div>
    </div>
  );
}
