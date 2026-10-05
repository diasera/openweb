"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Perubahan programatik (toggle Switch, FileList hasil editor, hapus gambar)
 * tidak memicu `input`/`change` native. Event kustom yang menggelembung ini
 * adalah satu-satunya jalur kontrol semacam itu memberi tahu form induknya.
 * Sengaja bukan `change`: event itu memicu ulang onChange milik React.
 */
const FORM_CHANGE_EVENT = "openweb:form-change";

/** Tandai form yang memuat `element` sebagai berubah. Aman bila null. */
export function notifyFormChange(element: Element | null | undefined) {
  element?.dispatchEvent(new Event(FORM_CHANGE_EVENT, { bubbles: true }));
}

/**
 * Pelacak perubahan form yang belum disimpan: dipakai untuk chip "belum
 * disimpan" dan guard beforeunload agar perubahan tidak hilang diam-diam.
 * Pemanggil wajib memanggil setDirty(false) setelah simpan berhasil.
 */
export function useFormDirty(formRef: RefObject<HTMLFormElement | null>) {
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const markDirty = () => setDirty(true);
    const events = ["input", "change", FORM_CHANGE_EVENT] as const;
    events.forEach((type) => form.addEventListener(type, markDirty));
    return () => {
      events.forEach((type) => form.removeEventListener(type, markDirty));
    };
  }, [formRef]);

  useEffect(() => {
    if (!dirty) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);

  return { dirty, setDirty };
}
