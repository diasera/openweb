import "server-only";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { textMentionsMember } from "./name-match";
import { isMissingRelationError } from "@/lib/database/errors";
import type { MemberMentionRow } from "@/lib/types/database";
import { blogMentionValues, mediaMentionValues } from "./mention-values";

type MentionTarget =
  | { mediaId: string; blogPostId?: never }
  | { blogPostId: string; mediaId?: never };

type MentionWriteRow = Pick<
  MemberMentionRow,
  "member_id" | "media_id" | "blog_post_id"
>;
type MentionScope = {
  column: "member_id" | "media_id" | "blog_post_id";
  id: string;
};
type MentionSyncContext = "sync" | "rebuild";
type MentionDatabaseError = Parameters<typeof isMissingRelationError>[0];

function targetColumn(target: MentionTarget): MentionScope {
  if ("mediaId" in target && target.mediaId) {
    return { column: "media_id" as const, id: target.mediaId };
  }
  if ("blogPostId" in target && target.blogPostId) {
    return { column: "blog_post_id" as const, id: target.blogPostId };
  }
  throw new Error("Target mention tidak valid.");
}

function mentionKey(row: MentionWriteRow): string | null {
  if (row.media_id) return `media:${row.member_id}:${row.media_id}`;
  if (row.blog_post_id) return `blog:${row.member_id}:${row.blog_post_id}`;
  return null;
}

function logMentionDatabaseError(
  context: MentionSyncContext,
  stage: string,
  error: MentionDatabaseError,
) {
  if (isMissingRelationError(error)) return;
  console.error(
    `[member-mentions:${context}-${stage}]`,
    error.message ?? "Kesalahan database tidak diketahui.",
  );
}

/**
 * Ganti indeks mention tanpa jendela data kosong: tulis seluruh target dahulu,
 * lalu hapus hanya baris lama yang tidak lagi diinginkan.
 */
async function replaceMemberMentions(
  sb: ReturnType<typeof createAdminSupabase>,
  scope: MentionScope,
  desiredRows: MentionWriteRow[],
  context: MentionSyncContext,
): Promise<void> {
  const { data: existingRows, error: readError } = await sb
    .from("member_mentions")
    .select("id, member_id, media_id, blog_post_id")
    .eq(scope.column, scope.id);
  if (readError) {
    logMentionDatabaseError(context, "read-existing", readError);
    return;
  }

  const mediaRows = desiredRows.filter((row) => row.media_id !== null);
  if (mediaRows.length > 0) {
    const { error } = await sb.from("member_mentions").upsert(mediaRows, {
      onConflict: "member_id,media_id",
    });
    if (error) {
      logMentionDatabaseError(context, "upsert-media", error);
      return;
    }
  }

  const blogRows = desiredRows.filter((row) => row.blog_post_id !== null);
  if (blogRows.length > 0) {
    const { error } = await sb.from("member_mentions").upsert(blogRows, {
      onConflict: "member_id,blog_post_id",
    });
    if (error) {
      logMentionDatabaseError(context, "upsert-blog", error);
      return;
    }
  }

  const desiredKeys = new Set(
    desiredRows.flatMap((row) => {
      const key = mentionKey(row);
      return key ? [key] : [];
    }),
  );
  const staleIds = (existingRows ?? []).flatMap((row) => {
    const key = mentionKey(row);
    return key && desiredKeys.has(key) ? [] : [row.id];
  });
  if (staleIds.length === 0) return;

  const { error: deleteError } = await sb
    .from("member_mentions")
    .delete()
    .in("id", staleIds);
  if (deleteError) {
    logMentionDatabaseError(context, "delete-stale", deleteError);
  }
}

/** Sinkronisasi pusat setiap kali admin menyimpan media atau blog. */
export async function syncMemberMentions(
  target: MentionTarget,
  searchableValues: unknown[],
): Promise<void> {
  const sb = createAdminSupabase();
  const { data: members, error: memberError } = await sb
    .from("members")
    .select("id, name");
  if (memberError) {
    console.error("[member-mentions:members]", memberError.message);
    return;
  }

  const matched = (members ?? []).filter((member) =>
    textMentionsMember(member.name, searchableValues),
  );
  const destination = targetColumn(target);
  await replaceMemberMentions(
    sb,
    destination,
    matched.map((member) => ({
      member_id: member.id,
      media_id: destination.column === "media_id" ? destination.id : null,
      blog_post_id:
        destination.column === "blog_post_id" ? destination.id : null,
    })),
    "sync",
  );
}

/** Nama anggota baru/diubah perlu dicocokkan kembali dengan konten lama. */
export async function rebuildMentionsForMember(
  memberId: string,
  memberName: string,
): Promise<void> {
  const sb = createAdminSupabase();
  const [mediaResult, blogResult] = await Promise.all([
    sb
      .from("media")
      .select("id, title, category, caption, uploader_name")
      .eq("source", "admin"),
    sb
      .from("blog_posts")
      .select("id, title, excerpt, category, tags, author_name, content_html"),
  ]);
  if (mediaResult.error || blogResult.error) {
    console.error(
      "[member-mentions:rebuild-read]",
      mediaResult.error?.message ?? blogResult.error?.message,
    );
    return;
  }
  const rows = [
    ...(mediaResult.data ?? [])
      .filter((media) =>
        textMentionsMember(memberName, mediaMentionValues(media)),
      )
      .map((media) => ({
        member_id: memberId,
        media_id: media.id,
        blog_post_id: null,
      })),
    ...(blogResult.data ?? [])
      .filter((post) =>
        textMentionsMember(memberName, blogMentionValues(post)),
      )
      .map((post) => ({
        member_id: memberId,
        media_id: null,
        blog_post_id: post.id,
      })),
  ];
  await replaceMemberMentions(
    sb,
    { column: "member_id", id: memberId },
    rows,
    "rebuild",
  );
}
