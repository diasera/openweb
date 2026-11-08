import Link from "next/link";
import { MessageSquareText, Play } from "lucide-react";
import { requireFeature } from "@/lib/auth";
import { getAdminComments } from "@/lib/admin/comments";
import { MEDIA_ADMIN_SECTIONS } from "@/lib/constants";
import { buildAdminPageMetadata } from "@/lib/seo";
import { deviceLabel } from "@/lib/utils/request";
import { parsePageParam } from "@/lib/utils/url";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaPreview } from "@/components/ui/media-preview";
import { RelativeTime } from "@/components/ui/relative-time";
import { Pagination } from "@/components/public/pagination";
import { AdminPage } from "@/components/admin/admin-page";
import { AdminList, AdminRow } from "@/components/admin/admin-list";
import { BanIpAction, DeleteAction } from "@/components/admin/admin-actions";
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
    <AdminPage
      feature="media"
      title="Komentar"
      description={`Moderasi komentar di semua pin — ${result.total} komentar.`}
      width="wide"
    >
      {result.rows.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText className="size-8" />}
          title="Belum ada komentar"
          description="Komentar pengunjung pada pin akan muncul di sini."
        />
      ) : (
        <AdminList label="Komentar">
          {result.rows.map((comment, index) => (
            <AdminRow
              key={comment.id}
              index={index}
              align="start"
              leading={
                <Link
                  href={`/pin/${comment.media_id}`}
                  title={comment.media?.title ?? "Buka pin"}
                  className="bg-surface-2 relative grid size-14 place-items-center overflow-hidden rounded-xl"
                >
                  {comment.media ? (
                    <MediaPreview
                      media={comment.media}
                      alt={comment.media.title ?? "Pin"}
                      sizes="56px"
                      seed={comment.media.id}
                      // Signed URL inbox berumur pendek: jangan disimpan cache optimizer.
                      unoptimized={comment.media.status !== "approved"}
                    />
                  ) : (
                    <Play className="text-muted size-4" aria-hidden="true" />
                  )}
                </Link>
              }
              title={comment.author_name || "Anonim"}
              meta={
                <>
                  <RelativeTime iso={comment.created_at} /> ·{" "}
                  {comment.media?.title || "Pin tanpa judul"} · {deviceLabel(comment.device)}
                </>
              }
              actions={
                <>
                  {comment.has_ip && (
                    <BanIpAction
                      action={banCommentIp}
                      id={comment.id}
                      message="IP ini diblokir dan semua komentar dari IP tersebut dihapus."
                    />
                  )}
                  <DeleteAction
                    action={deleteComment}
                    id={comment.id}
                    title="Hapus komentar ini?"
                    successMessage="Komentar dihapus"
                  />
                </>
              }
            >
              <p className="text-sm leading-relaxed wrap-break-word">{comment.content}</p>
            </AdminRow>
          ))}
        </AdminList>
      )}
      <Pagination
        basePath={MEDIA_ADMIN_SECTIONS.komentar.href}
        current={result.page}
        total={result.totalPages}
      />
    </AdminPage>
  );
}
