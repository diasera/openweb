"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFeature } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { checkedMutation } from "@/lib/database/mutation";
import { findAvailableSlug } from "@/lib/database/unique-slug";
import {
  isSchemaOutdatedError,
  SCHEMA_OUTDATED_MESSAGE,
} from "@/lib/database/errors";
import { MEDIA_ADMIN_SECTIONS } from "@/lib/constants";
import { slugify, withPreviousSlug } from "@/lib/utils/slug";
import {
  validationErrorMessage,
  type ActionResult,
} from "@/lib/action-result";

const optionalUuid = z.union([z.literal(""), z.uuid("Acara tidak valid")]);

const schema = z.object({
  id: optionalUuid,
  title: z.string().trim().min(1, "Judul album wajib diisi").max(120),
  description: z.string().trim().max(300),
  event_id: optionalUuid,
});

function revalidateAlbums(slugs: ReadonlyArray<string | null | undefined>) {
  revalidatePath(MEDIA_ADMIN_SECTIONS.album.href);
  revalidatePath("/profil/media");
  revalidatePath("/album");
  revalidatePath("/agenda");
  for (const slug of new Set(slugs)) if (slug) revalidatePath(`/album/${slug}`);
}

export async function saveAlbum(formData: FormData): Promise<ActionResult> {
  const admin = await requireFeature("media");
  const parsed = schema.safeParse({
    id: formData.get("id") ?? "",
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    event_id: formData.get("event_id") ?? "",
  });
  if (!parsed.success) return { error: validationErrorMessage(parsed) };
  const { id, title, description, event_id } = parsed.data;
  const sb = createAdminSupabase();

  const current = id
    ? await checkedMutation(
        "albums.load",
        "Gagal membaca album.",
        sb.from("albums").select("id, slug, previous_slugs").eq("id", id).maybeSingle(),
        { notFoundMessage: "Album tidak ditemukan." },
      )
    : null;
  if (current && !current.ok) return { error: current.error };

  const slug = await findAvailableSlug(
    "albums",
    slugify(title) || "album",
    id || null,
    (candidate) => sb.from("albums").select("id").eq("slug", candidate).maybeSingle(),
    current?.data.slug,
  );
  if (!slug.ok) {
    return { error: slug.error };
  }

  const payload = {
    title,
    slug: slug.data,
    description: description || null,
    event_id: event_id || null,
    ...(current?.data && current.data.slug !== slug.data
      ? {
          previous_slugs: withPreviousSlug(
            current.data.previous_slugs,
            current.data.slug,
            slug.data,
          ),
        }
      : {}),
  };
  const saved = await checkedMutation(
    id ? "albums.update" : "albums.create",
    id ? "Gagal memperbarui album." : "Gagal membuat album.",
    id
      ? sb.from("albums").update(payload).eq("id", id).select("id, slug").maybeSingle()
      : sb
          .from("albums")
          .insert({ ...payload, created_by: admin.id })
          .select("id, slug")
          .maybeSingle(),
    { duplicateMessage: "URL album sudah dipakai. Coba judul lain." },
  );
  if (!saved.ok) return { error: saved.error };
  revalidateAlbums([saved.data.slug, current?.data?.slug]);
  return {};
}

export async function deleteAlbum(id: string): Promise<ActionResult> {
  await requireFeature("media");
  const deleted = await checkedMutation(
    "albums.delete",
    "Gagal menghapus album.",
    createAdminSupabase()
      .from("albums")
      .delete()
      .eq("id", id)
      .select("id, slug")
      .maybeSingle(),
  );
  if (!deleted.ok) return { error: deleted.error };
  // Media tetap ada; FK `on delete set null` hanya melepas kaitan albumnya.
  revalidateAlbums([deleted.data.slug]);
  return {};
}

/** Masukkan/keluarkan satu media dari album (dipakai kartu moderasi). */
export async function setMediaAlbum(
  mediaId: string,
  albumId: string | null,
): Promise<ActionResult> {
  await requireFeature("media");
  const ids = z
    .object({ mediaId: z.uuid(), albumId: z.uuid().nullable() })
    .safeParse({ mediaId, albumId });
  if (!ids.success) return { error: "Data album tidak valid." };
  const sb = createAdminSupabase();

  let albumSlug: string | null = null;
  if (albumId) {
    const album = await sb.from("albums").select("slug").eq("id", albumId).maybeSingle();
    if (album.error) {
      return {
        error: isSchemaOutdatedError(album.error)
          ? SCHEMA_OUTDATED_MESSAGE
          : "Gagal membaca album.",
      };
    }
    if (!album.data) return { error: "Album tidak ditemukan." };
    albumSlug = album.data.slug;
  }

  const previous = await sb.from("media").select("album_id").eq("id", mediaId).maybeSingle();
  const updated = await checkedMutation(
    "media.album",
    "Gagal mengubah album media.",
    sb.from("media").update({ album_id: albumId }).eq("id", mediaId).select("id").maybeSingle(),
  );
  if (!updated.ok) return { error: updated.error };

  const previousAlbumId = previous.data?.album_id;
  const previousSlug =
    previousAlbumId && previousAlbumId !== albumId
      ? (await sb.from("albums").select("slug").eq("id", previousAlbumId).maybeSingle())
          .data?.slug
      : null;
  revalidateAlbums([albumSlug, previousSlug]);
  revalidatePath(`/pin/${mediaId}`);
  return {};
}
