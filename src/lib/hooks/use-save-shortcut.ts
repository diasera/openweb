"use client";

import { useEffect, useRef } from "react";

/**
 * Ctrl/⌘+S menjalankan simpan milik editor yang sedang terbuka (artikel,
 * postingan, pengaturan) alih-alih dialog "Save page" browser. Handler
 * terbaru selalu dipakai tanpa memasang ulang listener.
 */
export function useSaveShortcut(onSave: () => void, enabled = true) {
  const handlerRef = useRef(onSave);
  useEffect(() => {
    handlerRef.current = onSave;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handlerRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
