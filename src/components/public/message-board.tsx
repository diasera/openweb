import { MessageSquare } from "lucide-react";
import { Masonry } from "@/components/ui/masonry";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { listReveal } from "@/components/motion";
import { MessageComposer } from "./message-composer";
import { MessageCard } from "./message-card";
import type { PublicMessage } from "@/lib/data";

const TITLE = "Pesan Anonim";
const SUBTITLE = "Siapa pun bisa kirim — tanpa nama, tanpa login.";

/**
 * Section pesan reusable: `section` untuk pratinjau homepage, `page` untuk
 * halaman /pesan (judul menjadi h1 Large Title).
 */
export function MessageBoard({
  messages,
  actionHref,
  showComposer = true,
  emptyDescription = "Belum ada pesan anonim. Jadilah yang pertama mengirim.",
  composerSuccessNote,
  variant = "section",
}: {
  messages: PublicMessage[];
  actionHref?: string;
  showComposer?: boolean;
  emptyDescription?: string;
  composerSuccessNote?: string;
  variant?: "section" | "page";
}) {
  return (
    <section id="pesan" className="scroll-mt-20">
      {variant === "page" ? (
        <PageHeader size="large" title={TITLE} description={SUBTITLE} />
      ) : (
        <SectionHeader title={TITLE} subtitle={SUBTITLE} actionHref={actionHref} />
      )}
      {showComposer && (
        <div className="mb-4">
          <MessageComposer successNote={composerSuccessNote} />
        </div>
      )}
      {messages.length > 0 ? (
        <Masonry>
          {messages.map((m, index) => (
            <div key={m.id} {...listReveal(index)}>
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
