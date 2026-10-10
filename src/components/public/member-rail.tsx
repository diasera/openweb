import { Avatar } from "@/components/ui/avatar";
import type { MemberRow } from "@/lib/types/database";
import { MotionLink, staggerDelay } from "@/components/motion";
import { memberProfilePath } from "@/lib/members/slug";

/**
 * Baris anggota (scroll horizontal) dengan tepi yang memudar. Setiap item
 * punya lebar tetap; nama boleh dua baris agar tetap terbaca. Avatar 44px di
 * ponsel (HIG) lalu 54px dari sm. Hover: avatar terangkat dan cincin anggota
 * inti berputar. `scroll-px-4` menyamakan titik snap dengan gutter halaman.
 */
export function MemberRail({ members }: { members: MemberRow[] }) {
  return (
    <div className="motion-horizontal-scroll no-scrollbar edge-fade-x -mx-4 flex scroll-px-4 gap-2 overflow-x-auto px-4 pb-2 pt-1 sm:gap-3 lg:-mx-6 lg:scroll-px-6 lg:px-6">
      {members.map((m, index) => (
        <MotionLink
          key={m.id}
          href={memberProfilePath(m)}
          prefetch={false}
          title={m.name}
          className="group animate-rise motion-pressable flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-2xl sm:w-20"
          style={{ animationDelay: staggerDelay(index) }}
        >
          <span
            className="transition-transform duration-500 ease-(--motion-spring-snappy) group-hover:-translate-y-1"
            style={{ viewTransitionName: `member-${m.slug}` }}
          >
            <Avatar
              name={m.name}
              src={m.photo_url}
              size={54}
              ring={m.is_pengurus}
              reserveRingSpace
              sizeClassName="h-11 w-11 sm:size-13.5"
              initialsClassName="text-lg sm:text-title2"
            />
          </span>
          <span className="line-clamp-2 w-full text-center text-xs font-semibold leading-tight break-words">
            {m.name}
          </span>
          {m.position && (
            <span className="text-primary-readable -mt-0.5 w-full truncate text-center text-caption2">
              {m.position}
            </span>
          )}
        </MotionLink>
      ))}
    </div>
  );
}
