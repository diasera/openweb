"use client";

import { useCallback, useEffect, useState } from "react";

/** Menahan elemen saat animasi keluar agar modal/drawer tidak hilang mendadak. */
export function useMotionPresence(open: boolean, fallbackMs = 420) {
  const [present, setPresent] = useState(open);
  const [active, setActive] = useState(open);

  useEffect(() => {
    let presenceFrame: number | undefined;
    let activeFrame: number | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    if (open) {
      // State presence tidak boleh diubah saat render. React 19 dapat membatalkan
      // render tersebut sehingga dialog tidak pernah dipasang ke DOM.
      presenceFrame = requestAnimationFrame(() => {
        setPresent(true);
        activeFrame = requestAnimationFrame(() => setActive(true));
      });
    } else {
      activeFrame = requestAnimationFrame(() => setActive(false));
      timeout = setTimeout(() => setPresent(false), fallbackMs);
    }

    return () => {
      if (presenceFrame !== undefined) cancelAnimationFrame(presenceFrame);
      if (activeFrame !== undefined) cancelAnimationFrame(activeFrame);
      if (timeout) clearTimeout(timeout);
    };
  }, [fallbackMs, open]);

  const finishExit = useCallback(() => {
    if (!open) setPresent(false);
  }, [open]);

  return { active, finishExit, present };
}
