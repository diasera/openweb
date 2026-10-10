"use client";

import { Archive, Send } from "lucide-react";
import { setPostStatus } from "@/app/profil/(admin)/blog/actions";
import type { PostStatus } from "@/lib/types/database";
import { IconAction } from "../admin-actions";

/** Terbitkan draf/arsip, atau arsipkan artikel yang sudah terbit. */
export function PostStatusAction({ id, status }: { id: string; status: PostStatus }) {
  return status === "published" ? (
    <IconAction
      label="Arsipkan"
      icon={<Archive />}
      action={() => setPostStatus(id, "archived")}
      successMessage="Artikel diarsipkan"
      confirm={{
        title: "Arsipkan artikel?",
        message: "Artikel hilang dari blog publik dan sitemap, tetapi bisa diterbitkan lagi kapan saja.",
        confirmLabel: "Arsipkan",
        destructive: false,
      }}
    />
  ) : (
    <IconAction
      label="Terbitkan"
      icon={<Send />}
      tone="primary"
      action={() => setPostStatus(id, "published")}
      successMessage="Artikel diterbitkan"
    />
  );
}
