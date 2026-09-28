"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./auth-theater.module.css";

const RADIUS = 96;
const PULL = 10;

/**
 * Pembungkus magnetik: elemen tertarik lembut ke kursor saat berada di
 * sekitarnya. Progressive enhancement — mati otomatis di perangkat sentuh
 * dan prefers-reduced-motion.
 */
export function Magnetic({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist >= RADIUS || dist === 0) {
        el.style.transform = "";
        return;
      }
      const pull = (1 - dist / RADIUS) * PULL;
      el.style.transform = `translate(${((dx / dist) * pull).toFixed(2)}px, ${((dy / dist) * pull).toFixed(2)}px)`;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div ref={ref} className={styles.magnetic}>
      {children}
    </div>
  );
}
