"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFeature } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { checkedMutation } from "@/lib/database/mutation";
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
import {
  removeManagedImageIfUnused,
  uploadManagedImage,
  type ManagedImageAsset,
} from "@/lib/assets/managed-images";

const schema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(80),
  nim: z.string().trim().max(30),
  position: z.string().trim().max(40),
  bio: z.string().trim().max(400),
  sort_order: z.coerce.number().int().min(0).catch(0),
});

type Sb = ReturnType<typeof createAdminSupabase>;

async function isMemberPhotoReferenced(sb: Sb, url: string): Promise<boolean> {
  const { data, error } = await sb
    .from("members")
    .select("id")
    .eq("photo_url", url)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data ?? []).length > 0;
}

function revalidateMembers() {
  revalidatePath("/profil/anggota");
  revalidatePath("/profil");
  revalidatePath("/");
  revalidatePath("/anggota");
}

export async function saveMember(
  formData: FormData,
): Promise<ActionResult> {
  await requireFeature("anggota");
  const parsed = schema.safeParse({
    name: formData.get("name") ?? "",
    nim: formData.get("nim") ?? "",
    position: formData.get("position") ?? "",
    bio: formData.get("bio") ?? "",
    sort_order: formData.get("sort_order") ?? 0,
  });
  if (!parsed.success) {
    return { error: validationErrorMessage(parsed) };
  }

  const sb = createAdminSupabase();
  const id = formData.get("id")?.toString() || null;

  const { data: currentMember, error: currentMemberError } = id
    ? await sb
        .from("members")
        .select("id, slug, photo_url")
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
  const normalizedOtherMembers = ensureMemberSlugs(otherMembers ?? []);
  const slug = nextAvailableMemberSlug(
    parsed.data.name,
    normalizedOtherMembers.map((member) => member.slug),
  );

  // Foto opsional — hanya di-upload bila ada file baru.
  let uploadedPhoto: ManagedImageAsset | undefined;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const uploaded = await uploadManagedImage("member-photo", photo);
    if (!uploaded.ok) return { error: uploaded.error };
    uploadedPhoto = uploaded.asset;
  }
  const payload = {
    name: parsed.data.name,
    slug,
    nim: parsed.data.nim || null,
    position: parsed.data.position || null,
    is_pengurus: formData.get("is_pengurus") === "on",
    bio: parsed.data.bio || null,
    sort_order: parsed.data.sort_order,
    ...(uploadedPhoto ? { photo_url: uploadedPhoto.url } : {}),
  };

  const saved = id
    ? await checkedMutation(
        "members.update",
        "Gagal memperbarui anggota.",
        (currentMember?.photo_url
          ? sb
              .from("members")
              .update(payload)
              .eq("id", id)
              .eq("photo_url", currentMember.photo_url)
          : sb
              .from("members")
              .update(payload)
              .eq("id", id)
              .is("photo_url", null))
          .select("id, slug")
          .maybeSingle(),
        {
          notFoundMessage:
            "Profil berubah di sesi lain. Muat ulang sebelum menyimpan kembali.",
        },
      )
    : await checkedMutation(
        "members.create",
        "Gagal menambahkan anggota.",
        sb.from("members").insert(payload).select("id, slug").maybeSingle(),
      );
  if (!saved.ok) {
    if (uploadedPhoto) {
      await removeManagedImageIfUnused(
        uploadedPhoto,
        (url) => isMemberPhotoReferenced(sb, url),
      );
    }
    return { error: saved.error };
  }

  if (
    currentMember?.photo_url &&
    uploadedPhoto &&
    currentMember.photo_url !== uploadedPhoto.url
  ) {
    await removeManagedImageIfUnused(
      { kind: "member-photo", url: currentMember.photo_url },
      (url) => isMemberPhotoReferenced(sb, url),
    );
  }

  await rebuildMentionsForMember(saved.data.id, parsed.data.name);
  revalidateMembers();
  if (currentMember?.slug && currentMember.slug !== saved.data.slug) {
    revalidatePath(`/profil/${currentMember.slug}`);
  }
  revalidatePath(`/profil/${saved.data.id}`);
  revalidatePath(memberProfilePath(saved.data));
  return {};
}

export async function deleteMember(id: string): Promise<ActionResult> {
  await requireFeature("anggota");
  const sb = createAdminSupabase();
  const deleted = await checkedMutation(
    "members.delete",
    "Gagal menghapus anggota.",
    sb
      .from("members")
      .delete()
      .eq("id", id)
      .select("id, slug, photo_url")
      .maybeSingle(),
  );
  if (!deleted.ok) return { error: deleted.error };
  if (deleted.data.photo_url) {
    await removeManagedImageIfUnused(
      { kind: "member-photo", url: deleted.data.photo_url },
      (url) => isMemberPhotoReferenced(sb, url),
    );
  }
  revalidateMembers();
  revalidatePath(`/profil/${deleted.data.slug}`);
  return {};
}
