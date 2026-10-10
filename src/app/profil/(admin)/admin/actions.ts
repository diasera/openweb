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
import { adminFeatureHref, ASSIGNABLE_FEATURES } from "@/lib/constants";
import { checkedMutation } from "@/lib/database/mutation";
import { INVALID_INPUT, isValidId } from "@/lib/admin/guard";
import type { AdminRow } from "@/lib/types/database";
import {
  validationErrorMessage,
  type ActionResult,
} from "@/lib/action-result";

/** Centang izin dari form -> peta { fitur: boolean } (hanya fitur yang boleh diberikan). */
function permissionsFromForm(formData: FormData): Record<string, boolean> {
  return Object.fromEntries(
    ASSIGNABLE_FEATURES.map((feature) => [feature, formData.get(`perm_${feature}`) === "on"]),
  );
}

const createSchema = z.object({
  name: adminNameSchema,
  username: adminUsernameSchema,
  password: adminPasswordSchema,
});

const updateSchema = z.object({
  id: z.uuid("ID admin tidak valid"),
  name: adminNameSchema,
  password: optionalAdminPasswordSchema,
});

function revalidateAdmins() {
  revalidatePath(adminFeatureHref("admin"));
}

/** Owner menambah admin baru (fitur ownerOnly: requireFeature menolak admin biasa). */
export async function createAdmin(formData: FormData): Promise<ActionResult> {
  await requireFeature("admin");
  const parsed = createSchema.safeParse({
    name: formData.get("name") ?? "",
    username: formData.get("username") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) return { error: validationErrorMessage(parsed) };

  const created = await checkedMutation(
    "admins.create",
    "Gagal membuat admin.",
    createAdminSupabase()
      .from("admins")
      .insert({
        name: parsed.data.name,
        username: parsed.data.username.toLowerCase(),
        password_hash: await hashPassword(parsed.data.password),
        role: "admin",
        permissions: permissionsFromForm(formData),
        is_active: true,
      })
      .select("id")
      .maybeSingle(),
    { duplicateMessage: "Username sudah dipakai." },
  );
  if (!created.ok) return { error: created.error };
  revalidateAdmins();
  return {};
}

export async function updateAdmin(formData: FormData): Promise<ActionResult> {
  await requireFeature("admin");
  const parsed = updateSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) return { error: validationErrorMessage(parsed) };

  const patch: Partial<AdminRow> = {
    name: parsed.data.name,
    permissions: permissionsFromForm(formData),
    is_active: formData.get("is_active") === "on",
  };
  if (parsed.data.password) {
    patch.password_hash = await hashPassword(parsed.data.password);
  }

  // Filter role=admin: akun owner tidak pernah bisa diubah lewat jalur ini.
  const updated = await checkedMutation(
    "admins.update",
    "Gagal memperbarui admin.",
    createAdminSupabase()
      .from("admins")
      .update(patch)
      .eq("id", parsed.data.id)
      .eq("role", "admin")
      .select("id")
      .maybeSingle(),
    { notFoundMessage: "Admin tidak ditemukan atau akun owner dipilih." },
  );
  if (!updated.ok) return { error: updated.error };
  revalidateAdmins();
  return {};
}

export async function deleteAdmin(id: string): Promise<ActionResult> {
  await requireFeature("admin");
  if (!isValidId(id)) return INVALID_INPUT;
  const deleted = await checkedMutation(
    "admins.delete",
    "Gagal menghapus admin.",
    createAdminSupabase()
      .from("admins")
      .delete()
      .eq("id", id)
      .eq("role", "admin")
      .select("id")
      .maybeSingle(),
    { notFoundMessage: "Admin tidak ditemukan atau akun owner dipilih." },
  );
  if (!deleted.ok) return { error: deleted.error };
  revalidateAdmins();
  return {};
}
