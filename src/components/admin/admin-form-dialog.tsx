"use client";

import { useState, type ReactNode } from "react";
import { CircleAlert, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { ActionResult } from "@/lib/action-result";
import { actionIconClass } from "./admin-actions";
import {
  useAdminFormAction,
  type AdminFormActionOptions,
} from "./use-admin-form-action";

type TriggerRender = (open: () => void) => ReactNode;

/**
 * Pusat seluruh dialog buat/edit admin: pemicu (tombol "Tambah …" atau ikon
 * pensil), sheet Modal, form, catatan galat inline, serta Batal/Simpan dengan
 * status pending. Dialog spesifik (anggota, acara, album, akun admin) hanya
 * menyumbang field-nya. Form dirender ulang setiap dibuka, jadi defaultValue
 * selalu mengikuti data terbaru dari server.
 */
export function AdminFormDialog({
  mode,
  title,
  description,
  createLabel = "Tambah",
  editLabel = "Edit",
  trigger,
  action,
  successMessage,
  successDescription,
  requestErrorMessage,
  submitLabel = "Simpan",
  validate,
  hidden,
  children,
}: {
  mode: "create" | "edit";
  title: string;
  description?: string;
  createLabel?: string;
  editLabel?: string;
  /** Pemicu kustom (mis. kartu di dasbor); default tombol/ikon sesuai mode. */
  trigger?: TriggerRender;
  action: (formData: FormData) => Promise<ActionResult>;
  successMessage: string;
  successDescription?: string;
  requestErrorMessage: string;
  submitLabel?: string;
  validate?: AdminFormActionOptions["validate"];
  /** Nilai tersembunyi (mis. id) yang ikut dikirim. */
  hidden?: Record<string, string>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const { onSubmit, pending } = useAdminFormAction({
    action,
    successMessage,
    successDescription,
    requestErrorMessage,
    validate,
    onStart: () => setNote(""),
    onError: setNote,
    onSuccess: () => setOpen(false),
  });

  const show = () => {
    setNote("");
    setOpen(true);
  };

  return (
    <>
      {trigger ? (
        trigger(show)
      ) : mode === "edit" ? (
        <button
          type="button"
          onClick={show}
          aria-label={editLabel}
          title={editLabel}
          className={actionIconClass("neutral")}
        >
          <Pencil className="size-4.5" aria-hidden="true" />
        </button>
      ) : (
        <Button onClick={show} className="motion-sheen relative overflow-hidden">
          <Plus className="size-4" aria-hidden="true" />
          {createLabel}
        </Button>
      )}

      <Modal open={open} onClose={() => !pending && setOpen(false)} title={title}>
        <form onSubmit={onSubmit} className="space-y-4">
          {description && (
            <p className="text-muted -mt-1 text-sm leading-relaxed">{description}</p>
          )}
          {hidden &&
            Object.entries(hidden).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}

          {children}

          {note && (
            <p
              role="alert"
              className="bg-danger/10 text-danger animate-fade-in flex items-start gap-2 rounded-2xl px-3.5 py-3 text-footnote font-medium leading-relaxed"
            >
              <CircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
              {note}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" pending={pending}>
              {pending ? "Menyimpan…" : submitLabel}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
