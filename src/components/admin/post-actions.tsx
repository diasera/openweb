"use client";

import { Send, Archive } from "lucide-react";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { setPostStatus } from "@/app/profil/(admin)/blog/actions";
import type { PostStatus } from "@/lib/types/database";

/** Tombol admin untuk mengubah status artikel dan menampilkan hasilnya. */
export function PostStatusButton({
  id,
  status,
}: {
  id: string;
  status: PostStatus;
}) {
  if (status === "published") {
    return (
      <AdminActionButton
        action={() => setPostStatus(id, "archived")}
        successMessage="Artikel diarsipkan"
        variant="outline"
        size="sm"
      >
        <Archive className="h-4 w-4" /> Arsip
      </AdminActionButton>
    );
  }
  return (
    <AdminActionButton
      action={() => setPostStatus(id, "published")}
      successMessage="Artikel diterbitkan"
      variant="outline"
      size="sm"
    >
      <Send className="h-4 w-4" /> Terbit
    </AdminActionButton>
  );
}
