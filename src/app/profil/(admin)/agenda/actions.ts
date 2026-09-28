"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireFeature } from "@/lib/auth";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { checkedMutation } from "@/lib/database/mutation";
import { adminFeatureHref } from "@/lib/constants";
import { normalizeNotificationHref } from "@/lib/utils/url";
import { zonedInputToDate } from "@/lib/utils/time";
import {
  validationErrorMessage,
  type ActionResult,
} from "@/lib/action-result";

const localDateTime = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Format waktu tidak valid");

const schema = z
  .object({
    id: z.union([z.literal(""), z.string().uuid()]),
    title: z.string().trim().min(1, "Judul acara wajib diisi").max(120),
    description: z.string().trim().max(1000),
    location: z.string().trim().max(120),
    url: z
      .string()
      .trim()
      .max(300)
      .refine(
        (value) => !value || normalizeNotificationHref(value) !== null,
        "Tautan harus berupa path internal atau URL HTTPS.",
      ),
    starts_local: localDateTime,
    ends_local: z.union([z.literal(""), localDateTime]),
  })
  .transform((data, context) => {
    const startsAt = zonedInputToDate(data.starts_local);
    const endsAt = data.ends_local ? zonedInputToDate(data.ends_local) : null;
    if (!startsAt) {
      context.addIssue({ code: "custom", message: "Waktu mulai tidak valid", path: ["starts_local"] });
      return z.NEVER;
    }
    if (data.ends_local && !endsAt) {
      context.addIssue({ code: "custom", message: "Waktu selesai tidak valid", path: ["ends_local"] });
      return z.NEVER;
    }
    if (endsAt && endsAt < startsAt) {
      context.addIssue({ code: "custom", message: "Waktu selesai harus setelah waktu mulai", path: ["ends_local"] });
      return z.NEVER;
    }
    return { ...data, startsAt, endsAt };
  });

/** Acara terdekat tampil di Dynamic Island pada semua halaman (root layout). */
function revalidateAgenda() {
  revalidatePath(adminFeatureHref("agenda"));
  revalidatePath("/agenda");
  revalidatePath("/", "layout");
}

export async function saveEvent(formData: FormData): Promise<ActionResult> {
  const admin = await requireFeature("agenda");
  const parsed = schema.safeParse({
    id: formData.get("id") ?? "",
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    location: formData.get("location") ?? "",
    url: formData.get("url") ?? "",
    starts_local: formData.get("starts_local") ?? "",
    ends_local: formData.get("ends_local") ?? "",
  });
  if (!parsed.success) return { error: validationErrorMessage(parsed) };
  const data = parsed.data;
  const payload = {
    title: data.title,
    description: data.description || null,
    location: data.location || null,
    url: normalizeNotificationHref(data.url),
    starts_at: data.startsAt.toISOString(),
    ends_at: data.endsAt?.toISOString() ?? null,
    is_published: formData.get("is_published") === "on",
  };
  const sb = createAdminSupabase();
  const saved = await checkedMutation(
    data.id ? "events.update" : "events.create",
    data.id ? "Gagal memperbarui acara." : "Gagal membuat acara.",
    data.id
      ? sb.from("events").update(payload).eq("id", data.id).select("id").maybeSingle()
      : sb
          .from("events")
          .insert({ ...payload, created_by: admin.id })
          .select("id")
          .maybeSingle(),
  );
  if (!saved.ok) return { error: saved.error };
  revalidateAgenda();
  return {};
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  await requireFeature("agenda");
  const deleted = await checkedMutation(
    "events.delete",
    "Gagal menghapus acara.",
    createAdminSupabase().from("events").delete().eq("id", id).select("id").maybeSingle(),
  );
  if (!deleted.ok) return { error: deleted.error };
  revalidateAgenda();
  return {};
}
