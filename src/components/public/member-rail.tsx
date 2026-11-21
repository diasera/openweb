import { Avatar } from "@/components/ui/avatar";
import type { MemberRow } from "@/lib/types/database";
import { MotionLink, SharedMorph, staggerDelay } from "@/components/motion";
import { memberProfilePath } from "@/lib/members/slug";
import { cn } from "@/lib/utils/cn";

/**
 * Baris anggota (scroll horizontal) dengan tepi yang memudar. Setiap item
 * punya lebar & tinggi nama seimbang agar label peran sejajar lurus; warna
 * aksen khusus pengurus inti sementara anggota reguler tampil tenang (`text-muted`).
 */
export function MemberRail({ members }: { members: MemberRow[] }) {
  return (
    <div className="motion-horizontal-scroll no-scrollbar edge-fade-x -mx-4 flex scroll-px-4 gap-2.5 overflow-x-auto px-4 pb-2 pt-1 sm:gap-3.5 lg:-mx-6 lg:scroll-px-6 lg:px-6">
      {members.map((m, index) => (
        <MotionLink
          key={m.id}
          href={memberProfilePath(m)}
          title={m.name}
          className="group animate-rise motion-pressable flex w-[4.75rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl sm:w-22"
          style={{ animationDelay: staggerDelay(index) }}
        >
          <SharedMorph name={`member-${m.slug}`}>
            <span className="transition-transform duration-500 ease-(--motion-spring-snappy) group-hover:-translate-y-1">
              <Avatar
                name={m.name}
                src={m.photo_url}
                size={56}
                ring={m.is_pengurus}
                reserveRingSpace
                sizeClassName="size-12 sm:size-14"
                initialsClassName="text-base sm:text-title3"
              />
            </span>
          </SharedMorph>
          <span className="group-hover:text-primary-readable line-clamp-2 min-h-[2.1em] w-full text-center text-xs font-semibold leading-tight break-words transition-colors">
            {m.name}
          </span>
          {m.position && (
            <span
              className={cn(
                "-mt-0.5 line-clamp-2 w-full text-center text-caption2 leading-tight",
                m.is_pengurus
                  ? "text-primary-readable font-semibold"
                  : "text-muted font-medium",
              )}
            >
              {m.position}
            </span>
          )}
        </MotionLink>
      ))}
    </div>
  );
}
