import { pastelTint } from "@/lib/utils/color";
import { timeAgo } from "@/lib/utils/time";
import { Card } from "@/components/ui/card";
import { MessageLike } from "./message-like";
import type { PublicMessage } from "@/lib/data";

/**
 * Kartu pesan anonim. Tint deterministik yang adaptif tema (color-mix dgn
 * --surface) supaya teks tetap terbaca di light MAUPUN dark.
 */
export function MessageCard({ message }: { message: PublicMessage }) {
  return (
    <Card
      variant="elevated"
      className="p-3.5"
      style={{ backgroundColor: pastelTint(message.id) }}
    >
      <p className="text-foreground text-[13px] leading-relaxed">
        {message.content}
      </p>
      <div className="text-muted mt-2 flex items-center justify-between text-[11px]">
        <span>{timeAgo(message.created_at)}</span>
        <MessageLike id={message.id} likes={message.likes} />
      </div>
    </Card>
  );
}
