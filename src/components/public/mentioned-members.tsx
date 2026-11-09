import { MotionLink } from "@/components/motion";
import { Avatar } from "@/components/ui/avatar";
import { cardClass } from "@/components/ui/card";
import { memberProfilePath } from "@/lib/members/slug";
import { getContentLabels, toDisplayLabel } from "@/lib/site-config";
import type { MemberRow, SiteSettingsRow } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";

/**
 * Daftar anggota yang ditandai pada pin galeri atau artikel blog.
 * Menghubungkan dua arah antara konten dan halaman `/profil/[slug]`.
 */
export function MentionedMembers({
  members,
  settings,
  className,
}: {
  members: readonly MemberRow[];
  settings: Pick<SiteSettingsRow, "content_labels" | "locale">;
  className?: string;
}) {
  if (members.length === 0) return null;
  const labels = getContentLabels(settings);
  const memberLabel = toDisplayLabel(labels.memberPlural, settings.locale);

  return (
    <section
      aria-label={`${memberLabel} dalam konten ini`}
      className={cn("mt-5", className)}
    >
      <p className="text-muted mb-2 text-xs font-semibold uppercase tracking-wider">
        {memberLabel} terkait
      </p>
      <div className="flex flex-wrap gap-2">
        {members.map((member) => (
          <MotionLink
            key={member.id}
            href={memberProfilePath(member)}
            prefetch={false}
            className={cardClass(
              "interactive",
              "inline-flex max-w-full items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5",
            )}
          >
            <Avatar
              name={member.name}
              src={member.photo_url}
              size={26}
              ring={member.is_pengurus}
            />
            <span className="min-w-0 truncate text-xs font-semibold">
              {member.name}
            </span>
            {member.position && (
              <span className="text-muted hidden truncate text-caption2 sm:inline">
                · {member.position}
              </span>
            )}
          </MotionLink>
        ))}
      </div>
    </section>
  );
}
