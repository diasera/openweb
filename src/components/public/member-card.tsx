import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { cardClass } from "@/components/ui/card";
import type { MemberRow } from "@/lib/types/database";
import { MotionLink } from "@/components/motion";
import { memberProfilePath } from "@/lib/members/slug";

/** Kartu direktori reusable: avatar, nama, nomor identitas, dan peran. */
export function MemberCard({ member }: { member: MemberRow }) {
  return (
    <MotionLink
      href={memberProfilePath(member)}
      prefetch={false}
      className={cardClass("interactive", "flex flex-col items-center gap-2 p-4 text-center")}
    >
      <Avatar name={member.name} src={member.photo_url} size={64} ring={member.is_pengurus} />
      <div>
        <p className="font-semibold leading-tight">{member.name}</p>
        {member.nim && <p className="text-muted mt-0.5 text-xs">{member.nim}</p>}
      </div>
      {member.position && (
        <Chip variant={member.is_pengurus ? "softPrimary" : "soft"}>
          {member.position}
        </Chip>
      )}
    </MotionLink>
  );
}
