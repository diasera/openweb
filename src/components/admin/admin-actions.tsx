"use client";

import Link from "next/link";
import { useState, type ComponentProps, type ReactNode } from "react";
import {
  Ban,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils/cn";
import { useAdminAction } from "./use-admin-action";

export type ActionTone = "neutral" | "danger" | "success" | "primary";

const TONES: Record<ActionTone, string> = {
  neutral: "text-muted hover:bg-surface-2 hover:text-foreground",
  danger: "text-muted hover:bg-danger/10 hover:text-danger",
  success: "text-success hover:bg-success/10",
  primary: "text-primary-readable hover:bg-primary/10",
};

/** Satu bentuk tombol ikon admin (44px sentuh) untuk aksi, tautan, dan pemicu dialog. */
export function actionIconClass(tone: ActionTone = "neutral", className?: string) {
  return cn(
    "motion-pressable grid size-10 shrink-0 place-items-center rounded-xl transition-colors disabled:pointer-events-none disabled:opacity-40",
    TONES[tone],
    className,
  );
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
}

/**
 * Konfirmasi aksi berisiko sebagai sheet aplikasi (bukan window.confirm):
 * ikon peringatan, pesan, Batal/Konfirmasi. Fokus awal ada di dialog (Modal),
 * bukan di tombol hapus, agar Enter tidak langsung mengeksekusi.
 */
export function ConfirmSheet({
  open,
  options,
  onConfirm,
  onClose,
}: {
  open: boolean;
  options: ConfirmOptions;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const destructive = options.destructive ?? true;
  return (
    <Modal open={open} onClose={onClose} title={options.title}>
      <div className="flex flex-col items-center text-center">
        <span
          className={cn(
            "animate-control-pop grid size-14 place-items-center rounded-2xl",
            destructive ? "bg-danger/12 text-danger" : "bg-primary/10 text-primary-readable",
          )}
          aria-hidden="true"
        >
          <TriangleAlert className="size-7" />
        </span>
        <p className="text-muted mt-3 max-w-sm text-subhead leading-relaxed">
          {options.message}
        </p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <Button variant="secondary" onClick={onClose}>
          Batal
        </Button>
        <Button
          onClick={onConfirm}
          className={destructive ? "bg-tone-red text-white" : undefined}
        >
          {options.confirmLabel ?? (destructive ? "Hapus" : "Lanjutkan")}
        </Button>
      </div>
    </Modal>
  );
}

interface ActionRunProps {
  action: () => Promise<unknown>;
  successMessage?: string;
  errorMessage?: string;
  /** Tanpa ini aksi langsung jalan; dengan ini sheet konfirmasi muncul dulu. */
  confirm?: ConfirmOptions;
  onSuccess?: () => void;
}

/** Jalankan aksi dengan konfirmasi opsional; dipakai IconAction & AdminActionButton. */
function useConfirmedRun({
  action,
  successMessage,
  errorMessage = "Aksi gagal. Coba lagi.",
  confirm,
  onSuccess,
}: ActionRunProps) {
  const { pending, run } = useAdminAction();
  const [asking, setAsking] = useState(false);

  const execute = () => {
    setAsking(false);
    run(action, { successMessage, errorMessage, onSuccess });
  };

  return {
    pending,
    trigger: () => (confirm ? setAsking(true) : execute()),
    sheet: confirm ? (
      <ConfirmSheet
        open={asking}
        options={confirm}
        onConfirm={execute}
        onClose={() => setAsking(false)}
      />
    ) : null,
  };
}

/** Tombol ikon aksi admin: label aksesibel, nada warna, spinner saat pending. */
export function IconAction({
  label,
  icon: Icon,
  tone = "neutral",
  pressed,
  disabled,
  className,
  ...run
}: ActionRunProps & {
  label: string;
  icon: LucideIcon;
  tone?: ActionTone;
  pressed?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const { pending, trigger, sheet } = useConfirmedRun(run);
  return (
    <>
      <button
        type="button"
        onClick={trigger}
        disabled={disabled || pending}
        aria-label={label}
        aria-pressed={pressed}
        aria-busy={pending || undefined}
        title={label}
        className={actionIconClass(tone, className)}
      >
        {pending ? (
          <LoaderCircle className="size-4.5 animate-spin" aria-hidden="true" />
        ) : (
          <Icon className="size-4.5" aria-hidden="true" />
        )}
      </button>
      {sheet}
    </>
  );
}

/** Tautan berbentuk tombol ikon (edit, buka publik) dengan gaya yang sama. */
export function IconLink({
  label,
  icon: Icon,
  tone = "neutral",
  className,
  ...props
}: Omit<ComponentProps<typeof Link>, "children" | "className"> & {
  label: string;
  icon: LucideIcon;
  tone?: ActionTone;
  className?: string;
}) {
  return (
    <Link
      aria-label={label}
      title={label}
      className={actionIconClass(tone, className)}
      {...props}
    >
      <Icon className="size-4.5" aria-hidden="true" />
    </Link>
  );
}

/** Tombol teks untuk aksi admin (mis. "Tandai semua dibaca", "Terbitkan"). */
export function AdminActionButton({
  children,
  action,
  successMessage,
  errorMessage,
  confirm,
  onSuccess,
  disabled,
  ...buttonProps
}: Omit<ButtonProps, "onClick" | "type" | "action"> &
  ActionRunProps & { children: ReactNode }) {
  const { pending, trigger, sheet } = useConfirmedRun({
    action,
    successMessage,
    errorMessage,
    confirm,
    onSuccess,
  });
  return (
    <>
      <Button {...buttonProps} type="button" disabled={disabled || pending} onClick={trigger}>
        {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
        {children}
      </Button>
      {sheet}
    </>
  );
}

/** Hapus dengan semantik konsisten di seluruh halaman admin. */
export function DeleteAction({
  action,
  id,
  title = "Hapus item ini?",
  message = "Tindakan ini tidak dapat dibatalkan.",
  successMessage = "Berhasil dihapus",
}: {
  action: (id: string) => Promise<unknown>;
  id: string;
  title?: string;
  message?: string;
  successMessage?: string;
}) {
  return (
    <IconAction
      label="Hapus"
      icon={Trash2}
      tone="danger"
      action={() => action(id)}
      successMessage={successMessage}
      errorMessage="Gagal menghapus. Coba lagi."
      confirm={{ title, message, confirmLabel: "Hapus" }}
    />
  );
}

/** Blokir/buka blokir IP; tidak pernah menyamar sebagai tombol hapus. */
export function BanIpAction({
  action,
  id,
  blocked = false,
  message,
}: {
  action: (id: string) => Promise<unknown>;
  id: string;
  blocked?: boolean;
  message?: string;
}) {
  return (
    <IconAction
      label={blocked ? "Buka blokir IP" : "Blokir IP"}
      icon={blocked ? ShieldCheck : Ban}
      tone={blocked ? "success" : "danger"}
      pressed={blocked}
      action={() => action(id)}
      successMessage={blocked ? "Blokir IP dibuka" : "IP diblokir"}
      confirm={{
        title: blocked ? "Buka blokir IP?" : "Blokir IP ini?",
        message:
          message ??
          (blocked
            ? "Pengunjung dari IP ini dapat berkomentar, mengunggah, dan mengirim pesan lagi."
            : "IP ini tidak dapat lagi berkomentar, mengunggah, atau mengirim pesan anonim."),
        confirmLabel: blocked ? "Buka blokir" : "Blokir",
        destructive: !blocked,
      }}
    />
  );
}
