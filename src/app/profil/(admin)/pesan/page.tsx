import { Mail, MailOpen, MessageSquare, Pin, PinOff } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import {
  getAdminMessages,
  getMessageCounts,
  MESSAGE_FILTERS,
  type MessageFilter,
} from "@/lib/admin/messages";
import { isOneOf } from "@/lib/admin/guard";
import { adminFeatureHref } from "@/lib/constants";
import { buildAdminPageMetadata } from "@/lib/seo";
import { deviceLabel } from "@/lib/utils/request";
import { parsePageParam } from "@/lib/utils/url";
import { pastelTint } from "@/lib/utils/color";
import { EmptyState } from "@/components/ui/empty-state";
import { RelativeTime } from "@/components/ui/relative-time";
import { Pagination } from "@/components/public/pagination";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AdminList, AdminRow, StatusBadge } from "@/components/admin/admin-list";
import {
  AdminActionButton,
  BanIpAction,
  DeleteAction,
  IconAction,
} from "@/components/admin/admin-actions";
import {
  banMessageIp,
  deleteMessage,
  markAllMessagesRead,
  setMessageRead,
  togglePinMessage,
} from "./actions";

export const metadata = buildAdminPageMetadata("Pesan");

const BASE_PATH = adminFeatureHref("pesan");
const EMPTY_COPY: Record<MessageFilter, string> = {
  all: "Pesan anonim dari pengunjung akan muncul di sini.",
  unread: "Semua pesan sudah dibaca.",
  pinned: "Sematkan pesan pilihan agar tampil di halaman depan.",
};

export default async function PesanPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  await requireFeature("pesan");
  const { page, status } = await searchParams;
  const filter: MessageFilter = isOneOf(status, MESSAGE_FILTERS) ? status : "all";
  const [result, counts] = await Promise.all([
    getAdminMessages(parsePageParam(page), filter),
    getMessageCounts(),
  ]);

  return (
    <AdminPage
      feature="pesan"
      title="Pesan"
      description="Baca pesan anonim, sematkan yang terbaik ke halaman depan, dan tinjau IP serta perangkat pengirim."
      actions={
        counts.unread > 0 ? (
          <AdminActionButton
            action={markAllMessagesRead}
            successMessage="Semua pesan ditandai sudah dibaca"
            variant="outline"
            size="sm"
          >
            <MailOpen className="size-4" aria-hidden="true" />
            Tandai semua dibaca
          </AdminActionButton>
        ) : undefined
      }
      toolbar={
        <AdminTabs
          basePath={BASE_PATH}
          active={filter}
          items={[
            { label: "Semua", value: "all", count: counts.all },
            { label: "Belum dibaca", value: "unread", count: counts.unread, alert: counts.unread > 0 },
            { label: "Di beranda", value: "pinned", count: counts.pinned },
          ]}
        />
      }
    >
      {result.rows.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="size-8" />}
          title="Tidak ada pesan"
          description={EMPTY_COPY[filter]}
        />
      ) : (
        <AdminList label="Pesan anonim">
          {result.rows.map((message, index) => (
            <AdminRow
              key={message.id}
              index={index}
              align="start"
              highlight={!message.is_read}
              leading={
                <span
                  aria-hidden="true"
                  className="text-foreground/70 grid size-10 place-items-center rounded-xl"
                  style={{ backgroundColor: pastelTint(message.id) }}
                >
                  <MessageSquare className="size-4.5" />
                </span>
              }
              meta={
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <RelativeTime iso={message.created_at} />
                  <span>·</span>
                  <span>{deviceLabel(message.device)}</span>
                  <span>·</span>
                  <span className="font-mono">{message.ip_address ?? "IP tidak tersedia"}</span>
                  {!message.is_read && <StatusBadge tone="primary" live>Baru</StatusBadge>}
                  {message.is_pinned && <StatusBadge tone="success">Di beranda</StatusBadge>}
                </span>
              }
              actions={
                <>
                  <IconAction
                    label={message.is_pinned ? "Lepas dari beranda" : "Sematkan ke beranda"}
                    icon={message.is_pinned ? <PinOff /> : <Pin />}
                    tone={message.is_pinned ? "primary" : "neutral"}
                    pressed={message.is_pinned}
                    action={togglePinMessage.bind(null, message.id, !message.is_pinned)}
                    successMessage={
                      message.is_pinned
                        ? "Pesan dilepas dari halaman depan"
                        : "Pesan tampil di halaman depan"
                    }
                  />
                  <IconAction
                    label={message.is_read ? "Tandai belum dibaca" : "Tandai sudah dibaca"}
                    icon={message.is_read ? <Mail /> : <MailOpen />}
                    action={setMessageRead.bind(null, message.id, !message.is_read)}
                  />
                  {message.ip_address && (
                    <BanIpAction
                      action={banMessageIp}
                      id={message.id}
                      message="IP ini diblokir dan semua pesan dari IP tersebut dihapus."
                    />
                  )}
                  <DeleteAction
                    action={deleteMessage}
                    id={message.id}
                    title="Hapus pesan ini?"
                    successMessage="Pesan dihapus"
                  />
                </>
              }
            >
              <p className="text-sm leading-relaxed whitespace-pre-line wrap-break-word">
                {message.content}
              </p>
            </AdminRow>
          ))}
        </AdminList>
      )}
      <Pagination
        basePath={BASE_PATH}
        current={result.page}
        total={result.totalPages}
        query={{ status: filter === "all" ? undefined : filter }}
      />
    </AdminPage>
  );
}
