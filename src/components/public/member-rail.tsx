import { Avatar } from "@/components/ui/avatar";
import type { MemberRow } from "@/lib/types/database";
import { MotionLink, staggerDelay } from "@/components/motion";
import { memberProfilePath } from "@/lib/members/slug";

/**
 * Baris anggota (scroll horizontal). Setiap item punya lebar tetap agar profil
 * tidak terpotong; avatar 44px di ponsel (HIG) lalu naik ke 54px dari sm ke atas.
 */
export function MemberRail({ members }: { members: MemberRow[] }) {
  return (
    <div className="motion-horizontal-scroll no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:gap-3">
      {members.map((m, index) => (
        <MotionLink
          key={m.id}
          href={memberProfilePath(m)}
          prefetch={false}
          className="animate-rise motion-pressable flex w-14 shrink-0 flex-col items-center gap-1.5 sm:w-[68px]"
          style={{ animationDelay: staggerDelay(index) }}
        >
          <span style={{ viewTransitionName: `member-${m.slug}` }}>
            <Avatar
              name={m.name}
              src={m.photo_url}
              size={54}
              ring={m.is_pengurus}
              sizeClassName="h-11 w-11 sm:h-[54px] sm:w-[54px]"
              initialsClassName="text-[18px] sm:text-[22px]"
            />
          </span>
          <span className="w-full truncate text-center text-xs font-semibold">
            {m.name}
          </span>
          {m.position && (
            <span className="text-primary-readable -mt-1 w-full truncate text-center text-[11px]">
              {m.position}
            </span>
          )}
        </MotionLink>
      ))}
    </div>
  );
}
