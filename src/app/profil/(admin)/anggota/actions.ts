"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFeature } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { checkedMutation } from "@/lib/database/mutation";
import { INVALID_INPUT, isValidId } from "@/lib/admin/guard";
import { adminFeatureHref } from "@/lib/constants";
import {
  validationErrorMessage,
  type ActionResult,
} from "@/lib/action-result";
import { rebuildMentionsForMember } from "@/lib/members/mentions";
import {
  ensureMemberSlugs,
  memberProfilePath,
  nextAvailableMemberSlug,
} from "@/lib/members/slug";
import { withPreviousSlug } from "@/lib/utils/slug";
import { revalidateSeoIndexes } from "@/lib/seo/revalidate";
import {
  removeManagedImageIfUnused,
  uploadManagedImage,
  type ManagedImageAsset,
} from "@/lib/assets/managed-images";

const schema = z.object({
  id: z.union([z.literal(""), z.uuid("ID anggota tidak valid")]),
  name: z.string().trim().min(1, "Nama wajib diisi").max(80),
  nim: z.string().trim().max(30),
  position: z.string().trim().max(40),
  bio: z.string().trim().max(400),
  sort_order: z.coerce.number().int().min(0).max(100000).catch(0),
});

type Sb = ReturnType<typeof createAdminSupabase>;

async function isMemberPhotoReferenced(sb: Sb, url: string): Promise<boolean> {
  const { data, error } = await sb.from("members").select("id").eq("photo_url", url).limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

/** Anggota tampil di admin, dasbor, beranda (rail), direktori, dan Tentang. */
function revalidateMembers(paths: ReadonlyArray<string | null | undefined> = []) {
  revalidatePath(adminFeatureHref("anggota"));
  revalidatePath("/profil");
  revalidatePath("/");
  revalidatePath("/anggota");
  revalidatePath("/tentang");
  for (const path of new Set(paths)) if (path) revalidatePath(path);
  revalidateSeoIndexes();
}

export async function saveMember(formData: FormData): Promise<ActionResult> {
  await requireFeature("anggota");
  const parsed = schema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name") ?? "",
    nim: formData.get("nim") ?? "",
    position: formData.get("position") ?? "",
    bio: formData.get("bio") ?? "",
    sort_order: formData.get("sort_order") ?? 0,
  });
  if (!parsed.success) return { error: validationErrorMessage(parsed) };

  const sb = createAdminSupabase();
  const id = parsed.data.id || null;

  const { data: currentMember, error: currentMemberError } = id
    ? await sb
        .from("members")
        .select("id, slug, previous_slugs, photo_url")
        .eq("id", id)
        .maybeSingle()
    : { data: null, error: null };
  if (currentMemberError) return { error: "Gagal membaca profil anggota." };
  if (id && !currentMember) return { error: "Anggota tidak ditemukan." };

  const { data: otherMembers, error: slugLookupError } = await sb
    .from("members")
    .select("id, name, slug, sort_order, created_at")
    .neq("id", id ?? "00000000-0000-0000-0000-000000000000")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (slugLookupError) return { error: "Gagal menyiapkan URL profil anggota." };
  const slug = nextAvailableMemberSlug(
    parsed.data.name,
    ensureMemberSlugs(otherMembers ?? []).map((member) => member.slug),
    currentMember?.slug,
  );

  // Foto opsional — diunggah terakhir, setelah semua pemeriksaan lolos.
  let uploadedPhoto: ManagedImageAsset | undefined;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const uploaded = await uploadManagedImage("member-photo", photo);
    if (!uploaded.ok) return { error: uploaded.error };
    uploadedPhoto = uploaded.asset;
  }
  const removePhoto = !uploadedPhoto && formData.get("photo_remove") === "1";
  const payload = {
    name: parsed.data.name,
    slug,
    // Profil publik tetap bisa dibuka lewat URL lama setelah nama diganti.
    ...(currentMember?.slug && currentMember.slug !== slug
      ? {
          previous_slugs: withPreviousSlug(
            currentMember.previous_slugs,
            currentMember.slug,
            slug,
          ),
        }
      : {}),
    nim: parsed.data.nim || null,
    position: parsed.data.position || null,
    is_pengurus: formData.get("is_pengurus") === "on",
    bio: parsed.data.bio || null,
    sort_order: parsed.data.sort_order,
    ...(uploadedPhoto
      ? { photo_url: uploadedPhoto.url }
      : removePhoto
        ? { photo_url: null }
        : {}),
  };

  // Update dijaga foto saat ini: perubahan dari sesi lain tidak tertimpa diam-diam.
  const saved = id
    ? await checkedMutation(
        "members.update",
        "Gagal memperbarui anggota.",
        (currentMember?.photo_url
          ? sb.from("members").update(payload).eq("id", id).eq("photo_url", currentMember.photo_url)
          : sb.from("members").update(payload).eq("id", id).is("photo_url", null)
        )
          .select("id, slug")
          .maybeSingle(),
        { notFoundMessage: "Profil berubah di sesi lain. Muat ulang sebelum menyimpan kembali." },
      )
    : await checkedMutation(
        "members.create",
        "Gagal menambahkan anggota.",
        sb.from("members").insert(payload).select("id, slug").maybeSingle(),
      );
  if (!saved.ok) {
    if (uploadedPhoto) {
      await removeManagedImageIfUnused(uploadedPhoto, (url) => isMemberPhotoReferenced(sb, url));
    }
    return { error: saved.error };
  }

  const previousPhoto = currentMember?.photo_url;
  if (previousPhoto && (uploadedPhoto || removePhoto) && previousPhoto !== uploadedPhoto?.url) {
    await removeManagedImageIfUnused(
      { kind: "member-photo", url: previousPhoto },
      (url) => isMemberPhotoReferenced(sb, url),
    );
  }

  await rebuildMentionsForMember(saved.data.id, parsed.data.name);
  revalidateMembers([
    currentMember?.slug && currentMember.slug !== saved.data.slug
      ? `/profil/${currentMember.slug}`
      : null,
    memberProfilePath(saved.data),
  ]);
  return {};
}

export async function deleteMember(id: string): Promise<ActionResult> {
  await requireFeature("anggota");
  if (!isValidId(id)) return INVALID_INPUT;
  const sb = createAdminSupabase();
  const deleted = await checkedMutation(
    "members.delete",
    "Gagal menghapus anggota.",
    sb.from("members").delete().eq("id", id).select("id, slug, photo_url").maybeSingle(),
  );
  if (!deleted.ok) return { error: deleted.error };
  if (deleted.data.photo_url) {
    await removeManagedImageIfUnused(
      { kind: "member-photo", url: deleted.data.photo_url },
      (url) => isMemberPhotoReferenced(sb, url),
    );
  }
  revalidateMembers([`/profil/${deleted.data.slug}`]);
  return {};
}
