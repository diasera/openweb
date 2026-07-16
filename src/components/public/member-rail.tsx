import { Avatar } from "@/components/ui/avatar";
import type { MemberRow } from "@/lib/types/database";
import { MotionLink } from "@/components/motion";
import { memberProfilePath } from "@/lib/members/slug";

/**
 * Baris anggota (scroll horizontal). Setiap item punya lebar tetap agar profil
 * tidak terpotong; nama dan jabatan tetap memiliki ruang yang konsisten.
 */
export function MemberRail({ members }: { members: MemberRow[] }) {
  return (
    <div className="motion-horizontal-scroll no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
      {members.map((m) => (
        <MotionLink
          key={m.id}
          href={memberProfilePath(m)}
          prefetch={false}
          className="motion-pressable flex w-[68px] shrink-0 flex-col items-center gap-1.5"
        >
          <Avatar name={m.name} src={m.photo_url} size={54} ring={m.is_pengurus} />
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
