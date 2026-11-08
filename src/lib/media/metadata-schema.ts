import { z } from "zod";
import { zonedInputToDate } from "@/lib/utils/time";
import { MEDIA_METADATA_LIMITS } from "./metadata";

/**
 * Field teks detail pin bersama untuk API unggah (create) dan "Edit
 * postingan". Pemanggil menambah `.nullable().optional()` sesuai bentuk
 * input masing-masing.
 */
export const mediaMetadataFields = {
  title: z
    .string()
    .trim()
    .max(MEDIA_METADATA_LIMITS.title, `Judul maksimal ${MEDIA_METADATA_LIMITS.title} karakter.`),
  category: z
    .string()
    .trim()
    .max(MEDIA_METADATA_LIMITS.category, `Kategori maksimal ${MEDIA_METADATA_LIMITS.category} karakter.`),
  caption: z
    .string()
    .trim()
    .max(MEDIA_METADATA_LIMITS.caption, `Caption maksimal ${MEDIA_METADATA_LIMITS.caption} karakter.`),
  uploader_name: z
    .string()
    .trim()
    .max(
      MEDIA_METADATA_LIMITS.uploaderName,
      `Nama pengunggah maksimal ${MEDIA_METADATA_LIMITS.uploaderName} karakter.`,
    ),
};

/** Toleransi beda jam perangkat admin untuk "tanggal momen". */
const FUTURE_TOLERANCE_MS = 5 * 60_000;

/**
 * Detail "Edit postingan" (selain susunan media): teks, kategori, pengunggah,
 * komentar, album, sorotan, dan tanggal momen di zona situs. Tanggal yang
 * sama dengan nilai awal editor tidak menimpa created_at (input menit akan
 * membuang detiknya). Hasil transform = kolom yang siap ditulis.
 */
export const mediaDetailsSchema = z
  .object({
    ...mediaMetadataFields,
    allow_comments: z.boolean(),
    album_id: z.union([z.literal(""), z.uuid("Album tidak valid.")]),
    is_pinned: z.boolean(),
    occurred_local: z.string().trim().max(32),
    occurred_initial: z.string().trim().max(32),
  })
  .transform((data, context) => {
    let createdAt: string | null = null;
    if (data.occurred_local && data.occurred_local !== data.occurred_initial) {
      const occurredAt = zonedInputToDate(data.occurred_local);
      if (!occurredAt) {
        context.addIssue({ code: "custom", message: "Tanggal momen tidak valid.", path: ["occurred_local"] });
        return z.NEVER;
      }
      if (occurredAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
        context.addIssue({ code: "custom", message: "Tanggal momen tidak boleh di masa depan.", path: ["occurred_local"] });
        return z.NEVER;
      }
      createdAt = occurredAt.toISOString();
    }
    return {
      title: data.title || null,
      category: data.category || null,
      caption: data.caption || null,
      uploader_name: data.uploader_name || null,
      allow_comments: data.allow_comments,
      album_id: data.album_id || null,
      is_pinned: data.is_pinned,
      created_at: createdAt,
    };
  });

export type MediaDetailsInput = z.input<typeof mediaDetailsSchema>;
export type MediaDetails = z.output<typeof mediaDetailsSchema>;
