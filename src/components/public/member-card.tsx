import { ArrowUpRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { cardClass } from "@/components/ui/card";
import type { MemberRow } from "@/lib/types/database";
import { MotionLink, SharedMorph } from "@/components/motion";
import { memberProfilePath } from "@/lib/members/slug";
import { gradientCss } from "@/lib/utils/color";
import { cn } from "@/lib/utils/cn";

/**
 * Kartu direktori anggota bergaya Bento Editorial: pita aksen halus di atas,
 * avatar terangkat bercincin untuk anggota inti, nomor identitas monospace,
 * lencana peran, serta sorotan kursor (`data-spotlight`).
 */
export function MemberCard({
  member,
  enableMorph = true,
}: {
  member: MemberRow;
  enableMorph?: boolean;
}) {
  return (
    <MotionLink
      href={memberProfilePath(member)}
      data-spotlight
      className={cardClass(
        "interactive",
        "group relative flex h-full flex-col overflow-hidden text-center",
      )}
    >
      <div className="relative h-11 w-full shrink-0 overflow-hidden">
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0",
            member.is_pengurus
              ? "liquid-gradient grain opacity-24 dark:opacity-32"
              : "opacity-24 dark:opacity-28",
          )}
          style={
            member.is_pengurus
              ? undefined
              : { background: gradientCss(member.id) }
          }
        />
        <ArrowUpRight
          className="text-muted relative z-10 ml-auto mr-2.5 mt-2.5 size-3.5 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
          aria-hidden="true"
        />
      </div>

      <div className="-mt-7 flex flex-1 flex-col items-center gap-2 px-3.5 pb-4">
        <SharedMorph name={`member-${member.slug}`} enabled={enableMorph}>
          <span className="bg-surface inline-block rounded-full p-0.5 shadow-2xs [--avatar-gap:rgb(var(--surface))]">
            <Avatar
              name={member.name}
              src={member.photo_url}
              size={64}
              ring={member.is_pengurus}
              reserveRingSpace
            />
          </span>
        </SharedMorph>

        <div className="min-w-0">
          <p className="font-display group-hover:text-primary-readable line-clamp-2 text-sm font-bold leading-snug transition-colors">
            {member.name}
          </p>
          {member.nim && (
            <p className="text-muted mt-0.5 font-mono text-[0.7rem]">
              {member.nim}
            </p>
          )}
        </div>

        {member.position && (
          <div className="mt-auto pt-0.5">
            <Chip variant={member.is_pengurus ? "softPrimary" : "soft"}>
              {member.position}
            </Chip>
          </div>
        )}
      </div>
    </MotionLink>
  );
}
