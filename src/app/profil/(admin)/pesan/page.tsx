import { MessageSquare, Pin, PinOff } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import { countUnreadMessages, getAdminMessages } from "@/lib/admin/messages";
import { parsePageParam } from "@/lib/utils/url";
import { Pagination } from "@/components/public/pagination";
import { buildAdminPageMetadata } from "@/lib/seo";
import { deviceLabel } from "@/lib/utils/request";
import { timeAgo } from "@/lib/utils/time";
import { cn } from "@/lib/utils/cn";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import {
  BanIpButton,
  DeleteButton,
} from "@/components/admin/confirmed-action-button";
import {
  banMessageIp,
  deleteMessage,
  markAllMessagesRead,
  togglePinMessage,
} from "./actions";

export const metadata = buildAdminPageMetadata("Pesan");

export default async function PesanPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireFeature("pesan");
  const { page } = await searchParams;
  const [result, unread] = await Promise.all([
    getAdminMessages(parsePageParam(page)),
    countUnreadMessages(),
  ]);
  const messages = result.rows;
  const hasUnread = unread > 0;

  return (
    <div>
      <PageHeader
        title="Pesan"
        description="Kelola pesan anonim, pilih yang tampil di halaman depan, serta tinjau IP dan tipe device."
        action={
          hasUnread ? (
            <AdminActionButton
              action={markAllMessagesRead}
              successMessage="Semua pesan ditandai sudah dibaca"
              variant="outline"
              size="sm"
            >
              Tandai semua dibaca
            </AdminActionButton>
          ) : undefined
        }
      />

      {messages.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-8 w-8" />}
          title="Belum ada pesan"
          description="Pesan anonim dari pengunjung akan muncul di sini."
        />
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <Card
              key={m.id}
              className={cn("p-4", !m.is_read && "border-primary/30 bg-primary/3")}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm leading-relaxed">{m.content}</p>
                <div className="flex shrink-0 gap-1">
                  <AdminActionButton
                    action={togglePinMessage.bind(null, m.id, !m.is_pinned)}
                    successMessage={
                      m.is_pinned
                        ? "Pesan dilepas dari halaman depan"
                        : "Pesan disematkan ke halaman depan"
                    }
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-9 w-9 p-0",
                      m.is_pinned && "text-primary-readable",
                    )}
                    aria-label={
                      m.is_pinned
                        ? "Lepas dari halaman depan"
                        : "Pin ke halaman depan"
                    }
                    aria-pressed={m.is_pinned}
                    title={
                      m.is_pinned
                        ? "Lepas dari halaman depan"
                        : "Pin ke halaman depan"
                    }
                  >
                    {m.is_pinned ? (
                      <PinOff className="size-4.5" />
                    ) : (
                      <Pin className="size-4.5" />
                    )}
                  </AdminActionButton>
                  {m.ip_address && (
                    <BanIpButton
                      action={banMessageIp}
                      id={m.id}
                      message="Blokir IP ini? Semua pesan dari IP tersebut akan dihapus."
                    />
                  )}
                  <DeleteButton
                    action={deleteMessage}
                    id={m.id}
                    message="Hapus pesan ini?"
                  />
                </div>
              </div>
              <div className="text-muted mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span>{timeAgo(m.created_at)}</span>
                <span className="font-mono">IP: {m.ip_address ?? "—"}</span>
                <span>{deviceLabel(m.device)}</span>
                {m.is_pinned && (
                  <span className="text-primary-readable font-semibold">
                    di halaman depan
                  </span>
                )}
                {!m.is_read && (
                  <span className="text-primary-readable font-semibold">baru</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      <Pagination basePath="/profil/pesan" current={result.page} total={result.totalPages} />
    </div>
  );
}
