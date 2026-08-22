"use client";

import { useCallback, useState } from "react";
import { useDynamicIsland } from "./dynamic-island";
import { postJson } from "@/lib/api/client";

/** Hasil usaha menautkan perangkat ke kanal push. */
type PushEnroll =
  | "granted"
  | "denied"
  | "unsupported"
  | "ios-needs-install"
  | "failed";

const PUSH_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function pushCapable(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** applicationServerKey harus Uint8Array base64url — konversi standar VAPID. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = base64.replace(/-/g, "+").replace(/_/g, "/");
  const quotient = padded.length % 4;
  const normalized = quotient ? padded + "=".repeat(4 - quotient) : padded;
  const raw = atob(normalized);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function enrollPushDevice(): Promise<PushEnroll> {
  if (!pushCapable() || !PUSH_PUBLIC_KEY) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUSH_PUBLIC_KEY),
      }));

    const payload = subscription.toJSON();
    if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) {
      return "failed";
    }
    await postJson(
      "/api/push/subscribe",
      { endpoint: payload.endpoint, keys: payload.keys },
      "Gagal menautkan perangkat",
    );
    return "granted";
  } catch (error) {
    // iOS Safari menolak subscribe sebelum situs di-install sebagai PWA.
    if (error instanceof DOMException && error.name === "NotSupportedError") {
      return "ios-needs-install";
    }
    return "failed";
  }
}

async function releasePushDevice(): Promise<void> {
  if (!pushCapable()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } catch {
    /* best-effort: server sudah menghapus baris langganan via /api/bell. */
  }
}

const ENROLL_NOTICES: Record<
  PushEnroll,
  { description: string; status: "success" | "error" } | null
> = {
  granted: {
    status: "success",
    description: "Update terbaru akan langsung muncul di perangkat ini.",
  },
  denied: {
    status: "success",
    description:
      "Izin notifikasi browser ditolak — update tetap tersedia di halaman notifikasi.",
  },
  unsupported: {
    status: "success",
    description:
      "Browser ini belum mendukung push — update tetap tersedia di halaman notifikasi.",
  },
  "ios-needs-install": {
    status: "success",
    description:
      "Untuk push di iPhone/iPad: menu Bagikan → Tambahkan ke Layar Utama, lalu nyalakan lonceng dari aplikasi.",
  },
  failed: null, // pesan error generik dari catch utama.
};

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

        if (saved) {
          // Lonceng berhasil menyala — tautkan perangkat ini ke kanal push.
          const enroll = await enrollPushDevice();
          const notice =
            enroll === "failed"
              ? {
                  status: "success" as const,
                  description:
                    "Notifikasi aktif di halaman ini; kanal push perangkat gagal ditautkan.",
                }
              : ENROLL_NOTICES[enroll];
          updateNotice(noticeId, {
            status: notice?.status ?? "success",
            title: "Notifikasi aktif",
            description: notice?.description,
            duration: 2600,
          });
        } else {
          await releasePushDevice();
          updateNotice(noticeId, {
            status: "success",
            title: "Notifikasi dimatikan",
            description: "Kamu tidak lagi mengikuti update website.",
            duration: 1800,
          });
        }
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
