import Image from "next/image";
import Link from "next/link";
import { MessageSquareText, Play } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import { getAdminComments } from "@/lib/admin/comments";
import { MEDIA_ADMIN_SECTIONS } from "@/lib/constants";
import { buildAdminPageMetadata } from "@/lib/seo";
import { deviceLabel } from "@/lib/utils/request";
import { timeAgo } from "@/lib/utils/time";
import { parsePageParam } from "@/lib/utils/url";
import { PageHeader } from "@/components/ui/page-header";
import {
  BanIpButton,
  DeleteButton,
} from "@/components/admin/confirmed-action-button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/public/pagination";
import { banCommentIp, deleteComment } from "./actions";

export const metadata = buildAdminPageMetadata("Komentar");

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireFeature("media");
  const { page } = await searchParams;
  const result = await getAdminComments(parsePageParam(page));

  return (
    <div>
      <PageHeader
        title="Komentar"
        description={`Moderasi komentar di semua pin (${result.total} komentar).`}
      />

      {result.rows.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText className="h-8 w-8" />}
          title="Belum ada komentar"
          description="Komentar pengunjung pada pin akan muncul di sini."
        />
      ) : (
        <div className="space-y-2">
          {result.rows.map((comment) => (
            <Card key={comment.id} className="flex items-start gap-3 p-3">
              <Link
                href={`/pin/${comment.media_id}`}
                className="bg-surface-2 relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl"
                title={comment.media?.title ?? "Buka pin"}
              >
                {comment.media?.preview_url ? (
                  <Image
                    src={comment.media.preview_url}
                    alt={comment.media.title ?? "Pin"}
                    fill
                    sizes="56px"
                    unoptimized={comment.media.status !== "approved"}
                    className="object-cover"
                  />
                ) : (
                  <Play className="text-muted h-4 w-4" aria-hidden="true" />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">
                    {comment.author_name || "Anonim"}
                  </span>{" "}
                  <span className="text-muted text-xs">{timeAgo(comment.created_at)}</span>
                </p>
                <p className="mt-0.5 text-sm leading-relaxed break-words">
                  {comment.content}
                </p>
                <p className="text-muted mt-1 truncate text-xs">
                  {comment.media?.title || "Pin tanpa judul"} · {deviceLabel(comment.device)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {comment.has_ip && (
                  <BanIpButton
                    action={banCommentIp}
                    id={comment.id}
                    message="Blokir IP ini? Semua komentar dari IP tersebut akan dihapus."
                  />
                )}
                <DeleteButton
                  action={deleteComment}
                  id={comment.id}
                  message="Hapus komentar ini?"
                />
              </div>
            </Card>
          ))}
        </div>
      )}
      <Pagination
        basePath={MEDIA_ADMIN_SECTIONS.komentar.href}
        current={result.page}
        total={result.totalPages}
      />
    </div>
  );
}
