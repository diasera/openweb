import { pastelTint } from "@/lib/utils/color";
import { Card } from "@/components/ui/card";
import { RelativeTime } from "@/components/ui/relative-time";
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
      <p className="text-foreground text-footnote leading-relaxed">
        {message.content}
      </p>
      <div className="text-muted mt-2 flex items-center justify-between text-caption2">
        <RelativeTime iso={message.created_at} />
        <MessageLike id={message.id} likes={message.likes} />
      </div>
    </Card>
  );
}
