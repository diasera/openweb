"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type {
  FeedbackNoticeInput,
  FeedbackStatus,
} from "@/lib/feedback/types";

/**
 * API feedback bersama untuk seluruh fitur. Nama `toast` dipertahankan agar
 * semua pemanggil lama tetap reusable, tetapi renderer pop-up lamanya sudah
 * dihapus: setiap pesan kini masuk ke satu-satunya Dynamic Island.
 */
type ToastType = FeedbackStatus;

interface ToastOptions {
  description?: string;
  duration?: number;
}

interface ToastApi {
  success: (title: string, opts?: ToastOptions) => number;
  error: (title: string, opts?: ToastOptions) => number;
  info: (title: string, opts?: ToastOptions) => number;
  loading: (title: string, opts?: ToastOptions) => number;
  dismiss: (id: number) => void;
}

interface ToastContextValue {
  show: (type: ToastType, title: string, opts?: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const NOOP_ID = -1;

export function useToast(): { toast: ToastApi } {
  const ctx = useContext(ToastContext);
  const show = ctx?.show;
  const dismiss = ctx?.dismiss ?? (() => {});
  const make =
    (type: ToastType) =>
    (title: string, opts?: ToastOptions): number =>
      show ? show(type, title, opts) : NOOP_ID;

  return {
    toast: {
      success: make("success"),
      error: make("error"),
      info: make("info"),
      loading: (title, opts) =>
        show ? show("loading", title, { duration: Infinity, ...opts }) : NOOP_ID,
      dismiss,
    },
  };
}

export function ToastProvider({
  children,
  showNotice,
  dismissNotice,
}: {
  children: ReactNode;
  showNotice: (notice: FeedbackNoticeInput) => string;
  dismissNotice: (id: string) => void;
}) {
  const counter = useRef(0);
  const islandIds = useRef(new Map<number, string>());

  const dismiss = useCallback(
    (id: number) => {
      const islandId = islandIds.current.get(id);
      if (!islandId) return;
      dismissNotice(islandId);
      islandIds.current.delete(id);
    },
    [dismissNotice],
  );

  const show = useCallback(
    (type: ToastType, title: string, opts?: ToastOptions) => {
      const id = ++counter.current;
      const requestedDuration =
        opts?.duration ?? (type === "error" ? 5000 : type === "loading" ? Infinity : 3500);
      const islandId = showNotice({
        status: type,
        title,
        description: opts?.description,
        duration: Number.isFinite(requestedDuration)
          ? requestedDuration
          : undefined,
      });
      islandIds.current.set(id, islandId);

      // ID hanya diperlukan oleh pola loading -> dismiss. Batasi referensi lama.
      if (islandIds.current.size > 64) {
        const oldest = islandIds.current.keys().next().value;
        if (typeof oldest === "number") islandIds.current.delete(oldest);
      }
      return id;
    },
    [showNotice],
  );

  const value = useMemo(() => ({ show, dismiss }), [dismiss, show]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
