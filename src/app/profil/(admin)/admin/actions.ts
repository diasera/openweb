"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFeature } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import {
  adminNameSchema,
  adminPasswordSchema,
  adminUsernameSchema,
  optionalAdminPasswordSchema,
} from "@/lib/auth/credentials";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ASSIGNABLE_FEATURES } from "@/lib/constants";
import { checkedMutation } from "@/lib/database/mutation";
import type { AdminRow } from "@/lib/types/database";
import {
  validationErrorMessage,
  type ActionResult,
} from "@/lib/action-result";

/** Baca centang izin dari form -> peta { fitur: boolean }. */
function permsFromForm(fd: FormData): Record<string, boolean> {
  const perms: Record<string, boolean> = {};
  for (const f of ASSIGNABLE_FEATURES) perms[f] = fd.get(`perm_${f}`) === "on";
  return perms;
}

const createSchema = z.object({
  name: adminNameSchema,
  username: adminUsernameSchema,
  password: adminPasswordSchema,
});

const updateSchema = z.object({
  id: z.string().uuid("ID admin tidak valid"),
  name: adminNameSchema,
  password: optionalAdminPasswordSchema,
});

export async function createAdmin(fd: FormData): Promise<ActionResult> {
  await requireFeature("admin"); // ownerOnly -> hanya owner
  const parsed = createSchema.safeParse({
    name: fd.get("name"),
    username: fd.get("username"),
    password: fd.get("password"),
  });
  if (!parsed.success) {
    return { error: validationErrorMessage(parsed) };
  }
  const sb = createAdminSupabase();
  const password_hash = await hashPassword(parsed.data.password);
  const created = await checkedMutation(
    "admins.create",
    "Gagal membuat admin.",
    sb
      .from("admins")
      .insert({
        name: parsed.data.name,
        username: parsed.data.username.toLowerCase(),
        password_hash,
        role: "admin",
        permissions: permsFromForm(fd),
        is_active: true,
      })
      .select("id")
      .maybeSingle(),
    { duplicateMessage: "Username sudah dipakai." },
  );
  if (!created.ok) return { error: created.error };
  revalidatePath("/profil/admin");
  return {};
}

export async function updateAdmin(fd: FormData): Promise<ActionResult> {
  await requireFeature("admin");
  const parsed = updateSchema.safeParse({
    id: fd.get("id") ?? "",
    name: fd.get("name") ?? "",
    password: fd.get("password") ?? "",
  });
  if (!parsed.success) {
    return { error: validationErrorMessage(parsed) };
  }

  const sb = createAdminSupabase();

  const patch: Partial<AdminRow> = {
    name: parsed.data.name,
    permissions: permsFromForm(fd),
    is_active: fd.get("is_active") === "on",
  };
  if (parsed.data.password) {
    patch.password_hash = await hashPassword(parsed.data.password);
  }

  // .eq role admin -> owner tak bisa diubah lewat sini (aman).
  const updated = await checkedMutation(
    "admins.update",
    "Gagal memperbarui admin.",
    sb
      .from("admins")
      .update(patch)
      .eq("id", parsed.data.id)
      .eq("role", "admin")
      .select("id")
      .maybeSingle(),
    { notFoundMessage: "Admin tidak ditemukan atau akun owner dipilih." },
  );
  if (!updated.ok) return { error: updated.error };
  revalidatePath("/profil/admin");
  return {};
}

export async function deleteAdmin(id: string): Promise<ActionResult> {
  await requireFeature("admin");
  const sb = createAdminSupabase();
  const deleted = await checkedMutation(
    "admins.delete",
    "Gagal menghapus admin.",
    sb
      .from("admins")
      .delete()
      .eq("id", id)
      .eq("role", "admin")
      .select("id")
      .maybeSingle(),
    { notFoundMessage: "Admin tidak ditemukan atau akun owner dipilih." },
  );
  if (!deleted.ok) return { error: deleted.error };
  revalidatePath("/profil/admin");
  return {};
}
