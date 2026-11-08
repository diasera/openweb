import type { MediaStatus } from "@/lib/types/database";

/** Label + warna pil status moderasi; satu sumber untuk kartu dan editor. */
export const MEDIA_STATUS: Record<MediaStatus, { label: string; className: string }> = {
  pending: { label: "Menunggu", className: "bg-tone-orange text-white" },
  approved: { label: "Terbit", className: "bg-tone-green text-white" },
  rejected: { label: "Ditolak", className: "bg-black/55 text-white" },
};
