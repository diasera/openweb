"use client";

import { useEffect } from "react";

/**
 * Elemen yang mengikuti pointer; sinkron dengan selector tilt dan spotlight
 * di motion.css. [data-spotlight] hanya memakai posisi untuk cahaya tepi.
 */
const DEPTH_TILT_SELECTOR = ".motion-card, [data-depth-tilt], [data-spotlight]";

const clamp = (value: number) => Math.max(-1, Math.min(1, value));

/**
 * Satu listener pointer untuk seluruh aplikasi: mengisi --depth-px/--depth-py
 * pada elemen tilt di bawah kursor. Tanpa state React (tidak ada re-render),
 * di-throttle per frame, dan mati untuk sentuh atau reduced motion.
 */
export function useDepthPointer() {
  useEffect(() => {
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let target: HTMLElement | null = null;
    let rect: DOMRect | null = null;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    const release = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (target) {
        target.style.removeProperty("--depth-px");
        target.style.removeProperty("--depth-py");
        target.removeAttribute("data-depth-active");
      }
      target = null;
      rect = null;
    };

    const apply = () => {
      frame = 0;
      if (!target) return;
      // Diukur saat masuk/scroll saja, bukan tiap frame, agar tidak memicu layout.
      rect ??= target.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const px = clamp(((pointerX - rect.left) / rect.width) * 2 - 1);
      const py = clamp(((pointerY - rect.top) / rect.height) * 2 - 1);
      target.style.setProperty("--depth-px", px.toFixed(3));
      target.style.setProperty("--depth-py", py.toFixed(3));
      target.setAttribute("data-depth-active", "");
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch" || !finePointer.matches || reducedMotion.matches) {
        return;
      }
      const next =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(DEPTH_TILT_SELECTOR)
          : null;
      if (next !== target) {
        release();
        target = next;
      }
      if (!target) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const invalidateRect = () => {
      rect = null;
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", release);
    window.addEventListener("scroll", invalidateRect, { passive: true });
    window.addEventListener("blur", release);
    return () => {
      release();
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", release);
      window.removeEventListener("scroll", invalidateRect);
      window.removeEventListener("blur", release);
    };
  }, []);
}
