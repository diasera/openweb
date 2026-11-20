"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CopyPlus, Eye, Send, Sparkles } from "lucide-react";
import { sendNotification } from "@/app/profil/(admin)/pengunjung/actions";
import { Button } from "@/components/ui/button";
import type { QuickNotificationTarget } from "@/lib/admin/visitors";
import { cn } from "@/lib/utils/cn";
import { ConfirmSheet, actionIconClass } from "../admin-actions";
import { TextAreaField, TextField } from "../form-controls";
import { useAdminAction } from "../use-admin-action";

const REUSE_EVENT = "openweb:reuse-notification";

interface DraftPayload {
  title: string;
  body: string;
  url: string;
}

const KIND_BADGE: Record<QuickNotificationTarget["kind"], string> = {
  blog: "Artikel",
  event: "Agenda",
  album: "Album",
};

/**
 * Tulis notifikasi untuk pelanggan lonceng & perangkat push: dilengkapi Quick
 * Link Picker, pratinjau langsung yang tampil di ponsel maupun desktop,
 * konfirmasi `ConfirmSheet` sebelum siaran massal, serta dukungan isi ulang
 * dari riwayat notifikasi terkirim.
 */
export function NotificationComposer({
  quickTargets = [],
  bellCount = 0,
  pushCount = 0,
  vapidReady = false,
}: {
  quickTargets?: QuickNotificationTarget[];
  bellCount?: number;
  pushCount?: number;
  vapidReady?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<DraftPayload>({
    title: "",
    body: "",
    url: "",
  });
  const [mobilePreview, setMobilePreview] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { pending, run } = useAdminAction();

  useEffect(() => {
    function onReuse(event: Event) {
      const detail = (event as CustomEvent<DraftPayload>).detail;
      if (!detail) return;
      setDraft({
        title: detail.title ?? "",
        body: detail.body ?? "",
        url: detail.url ?? "",
      });
      document
        .getElementById("kirim-notifikasi")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("n-title")?.focus({ preventScroll: true });
    }
    window.addEventListener(REUSE_EVENT, onReuse);
    return () => window.removeEventListener(REUSE_EVENT, onReuse);
  }, []);

  function dispatchForm() {
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    run(() => sendNotification(formData), {
      successMessage: "Notifikasi terkirim",
      successDescription:
        vapidReady && pushCount > 0
          ? `Tersimpan di aplikasi & dikirim ke ${pushCount} perangkat push.`
          : "Tersimpan di halaman notifikasi & Dynamic Island.",
      errorMessage: "Koneksi terputus saat mengirim notifikasi. Coba lagi.",
      onSuccess: () => {
        setDraft({ title: "", body: "", url: "" });
        router.refresh();
      },
    });
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() || pending) return;
    if (pushCount > 0 && vapidReady) {
      setConfirmOpen(true);
      return;
    }
    dispatchForm();
  }

  const previewCard = (
    <div className="glass rounded-3xl p-3.5">
      <div className="flex items-start gap-3">
        <span className="gloss bg-primary text-primary-foreground grid size-9 shrink-0 place-items-center rounded-xl">
          <Bell className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {draft.title || "Judul notifikasi"}
          </p>
          <p className="text-muted line-clamp-3 text-caption1 leading-snug">
            {draft.body || "Isi singkat akan tampil di sini."}
          </p>
          {draft.url && (
            <p className="text-primary-readable mt-1 truncate font-mono text-[0.68rem]">
              {draft.url}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <form
        ref={formRef}
        onSubmit={handleFormSubmit}
        className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]"
      >
        <div className="space-y-4">
          {quickTargets.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-muted flex items-center gap-1.5 text-caption1 font-semibold">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Isi cepat dari konten terbaru
              </p>
              <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {quickTargets.map((target) => (
                  <button
                    key={target.url}
                    type="button"
                    onClick={() =>
                      setDraft({
                        title: target.title,
                        body: target.body,
                        url: target.url,
                      })
                    }
                    className="motion-pressable border-border bg-surface hover:bg-surface-2 inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
                  >
                    <span className="text-primary-readable font-bold">
                      {KIND_BADGE[target.kind]}
                    </span>
                    <span className="max-w-44 truncate">
                      {target.title.replace(/^[^:]+:\s*/, "")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <TextField
            label="Judul"
            id="n-title"
            name="title"
            required
            maxLength={120}
            value={draft.title}
            placeholder="Ada kabar baru!"
            onChange={(event) =>
              setDraft((value) => ({ ...value, title: event.target.value }))
            }
          />
          <TextAreaField
            label="Isi (opsional)"
            id="n-body"
            name="body"
            rows={2}
            maxLength={400}
            value={draft.body}
            placeholder="Detail singkat…"
            onChange={(event) =>
              setDraft((value) => ({ ...value, body: event.target.value }))
            }
          />
          <TextField
            label="Tautan (opsional)"
            id="n-url"
            name="url"
            maxLength={300}
            value={draft.url}
            placeholder="/blog/… atau https://…"
            hint="Dibuka saat notifikasi diketuk."
            onChange={(event) =>
              setDraft((value) => ({ ...value, url: event.target.value }))
            }
          />

          {/* Pratinjau responsif di ponsel */}
          <div className="space-y-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobilePreview((prev) => !prev)}
              className="text-primary-readable inline-flex items-center gap-1.5 text-xs font-semibold"
            >
              <Eye className="size-3.5" aria-hidden="true" />
              {mobilePreview ? "Sembunyikan pratinjau" : "Lihat pratinjau kartu"}
            </button>
            {mobilePreview && previewCard}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              pending={pending}
              icon={<Send className="size-4" aria-hidden="true" />}
              className="motion-sheen relative overflow-hidden"
            >
              {pending ? "Mengirim…" : "Kirim notifikasi"}
            </Button>
            {(draft.title || draft.body || draft.url) && (
              <button
                type="button"
                onClick={() => setDraft({ title: "", body: "", url: "" })}
                className="text-muted hover:text-foreground px-2.5 py-1.5 text-xs font-semibold"
              >
                Bersihkan
              </button>
            )}
          </div>
        </div>

        <figure aria-label="Pratinjau notifikasi" className="hidden lg:block">
          <figcaption className="text-muted mb-2 text-caption1 font-semibold uppercase tracking-wide">
            Pratinjau
          </figcaption>
          {previewCard}
        </figure>
      </form>

      <ConfirmSheet
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          dispatchForm();
        }}
        options={{
          title: "Kirim siaran notifikasi?",
          message: `Notifikasi “${draft.title.trim()}” akan tampil di aplikasi (${bellCount} lonceng) dan dikirim langsung sebagai Web Push ke ${pushCount} perangkat.`,
          confirmLabel: "Ya, Kirim Sekarang",
          destructive: false,
        }}
      />
    </>
  );
}

/** Tombol salin ulang notifikasi terkirim ke form komposer. */
export function ReuseNotificationButton({
  title,
  body,
  url,
}: {
  title: string;
  body: string | null;
  url: string | null;
}) {
  return (
    <button
      type="button"
      aria-label="Gunakan ulang notifikasi ini"
      title="Gunakan ulang di form"
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent<DraftPayload>(REUSE_EVENT, {
            detail: { title, body: body ?? "", url: url ?? "" },
          }),
        );
      }}
      className={cn(actionIconClass("primary"))}
    >
      <CopyPlus aria-hidden="true" />
    </button>
  );
}
