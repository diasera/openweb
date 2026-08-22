import { MessageSquare } from "lucide-react";
import { Masonry } from "@/components/ui/masonry";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { staggerDelay } from "@/components/motion";
import { MessageComposer } from "./message-composer";
import { MessageCard } from "./message-card";
import type { PublicMessage } from "@/lib/data";

/** Section pesan reusable untuk pratinjau homepage dan halaman daftar penuh. */
export function MessageBoard({
  messages,
  actionHref,
  showComposer = true,
  emptyDescription = "Belum ada pesan anonim. Jadilah yang pertama mengirim.",
}: {
  messages: PublicMessage[];
  actionHref?: string;
  showComposer?: boolean;
  emptyDescription?: string;
}) {
  return (
    <section id="pesan" className="scroll-mt-20">
      <SectionHeader
        title="Pesan Anonim"
        subtitle="Siapa pun bisa kirim — tanpa nama, tanpa login."
        actionHref={actionHref}
      />
      {showComposer && (
        <div className="mb-4">
          <MessageComposer />
        </div>
      )}
      {messages.length > 0 ? (
        <Masonry>
          {messages.map((m, index) => (
            <div
              key={m.id}
              className="animate-rise"
              style={{ animationDelay: staggerDelay(index) }}
            >
              <MessageCard message={m} />
            </div>
          ))}
        </Masonry>
      ) : (
        <EmptyState
          icon={<MessageSquare className="h-8 w-8" />}
          title="Belum ada pesan"
          description={emptyDescription}
        />
      )}
    </section>
  );
}
