import Image from "next/image";
import { History, ImageIcon, Newspaper, Play } from "lucide-react";
import { MotionLink } from "@/components/motion";
import { cardClass } from "@/components/ui/card";
import type { MemberActivityItem } from "@/lib/members/activity";

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ActivityVisual({ item }: { item: MemberActivityItem }) {
  if (item.imageUrl) {
    return (
      <Image
        src={item.imageUrl}
        alt=""
        fill
        sizes="88px"
        className="object-cover"
      />
    );
  }
  const Icon = item.kind === "blog" ? Newspaper : item.mediaType === "video" ? Play : ImageIcon;
  return (
    <span className="from-primary/18 to-accent/12 text-primary-readable grid h-full w-full place-items-center bg-gradient-to-br">
      <Icon className="h-6 w-6" />
    </span>
  );
}

export function MemberActivityFeed({
  memberName,
  items,
}: {
  memberName: string;
  items: MemberActivityItem[];
}) {
  return (
    <section className="mx-auto mt-8 max-w-2xl" aria-labelledby="member-history-title">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-primary-readable text-xs font-bold uppercase tracking-wider">
            History tag
          </p>
          <h2 id="member-history-title" className="font-display mt-0.5 text-xl font-bold">
            Aktivitas anggota
          </h2>
        </div>
        <span className="text-muted flex items-center gap-1.5 text-xs">
          <History className="h-4 w-4" /> {items.length} momen
        </span>
      </div>

      {items.length === 0 ? (
        <div className={cardClass("flat", "text-muted px-5 py-7 text-center text-sm")}>
          Belum ada media atau artikel yang menandai {memberName}.
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <MotionLink
              key={`${item.kind}-${item.id}`}
              href={item.href}
              prefetch={false}
              className={cardClass(
                "interactive",
                "motion-pressable flex min-w-0 items-center gap-3 overflow-hidden p-2.5",
              )}
            >
              <span className="relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl">
                <ActivityVisual item={item} />
                {item.kind === "media" && item.mediaType === "video" && item.imageUrl && (
                  <span className="absolute inset-0 grid place-items-center bg-black/20 text-white">
                    <Play className="h-5 w-5 fill-current" />
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1 py-0.5">
                <span className="text-primary-readable text-[10px] font-bold uppercase tracking-wider">
                  {item.kind === "blog"
                    ? "Blog"
                    : item.mediaType === "video"
                      ? "Video"
                      : "Foto"}
                </span>
                <span className="mt-0.5 block truncate text-sm font-semibold">
                  {item.title}
                </span>
                {item.description && (
                  <span className="text-muted mt-0.5 line-clamp-2 text-xs leading-relaxed">
                    {item.description}
                  </span>
                )}
                <span className="text-muted mt-1 block text-[10px]">
                  {dateLabel(item.occurredAt)}
                </span>
              </span>
            </MotionLink>
          ))}
        </div>
      )}
    </section>
  );
}
