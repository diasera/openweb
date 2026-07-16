"use client";

import { useCallback, useState } from "react";
import { useDynamicIsland } from "./dynamic-island";
import { postJson } from "@/lib/api/client";

/** Satu alur bersama untuk seluruh toggle lonceng + feedback Dynamic Island. */
export function useBellSubscription(initialEnabled: boolean) {
  const [enabled, setEnabledState] = useState(initialEnabled);
  const [pending, setPending] = useState(false);
  const { showNotice, updateNotice } = useDynamicIsland();

  const setEnabled = useCallback(
    async (nextEnabled: boolean) => {
      if (pending) return false;
      setPending(true);
      const noticeId = showNotice({
        status: "loading",
        title: nextEnabled
          ? "Mengaktifkan notifikasi"
          : "Mematikan notifikasi",
        description: "Menyimpan pilihan kamu…",
      });

      try {
        const data = await postJson<{
          enabled?: boolean;
        }>(
          "/api/bell",
          { enabled: nextEnabled },
          "Gagal menyimpan pilihan",
        );

        const saved = Boolean(data.enabled);
        setEnabledState(saved);
        if (saved) {
          try {
            localStorage.setItem("notifPrompt", "1");
          } catch {
            /* ignore */
          }
        }
        updateNotice(noticeId, {
          status: "success",
          title: saved ? "Notifikasi aktif" : "Notifikasi dimatikan",
          description: saved
            ? "Update terbaru akan muncul di halaman notifikasi."
            : "Kamu tidak lagi mengikuti update website.",
          duration: 1800,
        });
        return true;
      } catch (error) {
        updateNotice(noticeId, {
          status: "error",
          title: "Pilihan belum tersimpan",
          description:
            error instanceof Error ? error.message : "Silakan coba lagi.",
          duration: 2400,
        });
        return false;
      } finally {
        setPending(false);
      }
    },
    [pending, showNotice, updateNotice],
  );

  return { enabled, pending, setEnabled };
}
