"use client";

import { useEffect, useState, type RefObject } from "react";

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
    form.addEventListener("input", markDirty);
    form.addEventListener("change", markDirty);
    return () => {
      form.removeEventListener("input", markDirty);
      form.removeEventListener("change", markDirty);
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
