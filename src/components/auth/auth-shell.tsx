"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MotionPage } from "@/components/motion";
import { SiteLogo } from "@/components/public/site-logo";
import styles from "./auth-theater.module.css";

const LETTER_BASE_DELAY = 160;
const LETTER_STEP_MS = 70;
const TILT_MAX_X = 5;
const TILT_MAX_Y = 8;

/**
 * Gerbang Auth — panggung sinematik untuk login & setup admin:
 * aurora + bintang + grain, wordmark kinetik, kartu kaca 3D-tilt, dan
 * cincin logo yang menggambar dirinya. Semua animasi mati secara aman
 * pada prefers-reduced-motion dan perangkat sentuh.
 */
export function AuthShell({
  title,
  subtitle,
  logoUrl,
  siteName,
  children,
}: {
  title: string;
  subtitle?: string;
  logoUrl?: string | null;
  siteName?: string;
  children: ReactNode;
}) {
  const gateRef = useRef<HTMLDivElement>(null);

  /* Tilt 3D + sorotan kaca mengikuti pointer — hanya desktop, hanya bila
   * pengguna mengizinkan gerakan. */
  useEffect(() => {
    const gate = gateRef.current;
    if (!gate) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (event: PointerEvent) => {
      const rect = gate.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      const near = px > -0.45 && px < 1.45 && py > -0.6 && py < 1.6;
      gate.style.setProperty(
        "--tilt-x",
        near ? `${((0.5 - py) * 2 * TILT_MAX_X).toFixed(2)}deg` : "0deg",
      );
      gate.style.setProperty(
        "--tilt-y",
        near ? `${((px - 0.5) * 2 * TILT_MAX_Y).toFixed(2)}deg` : "0deg",
      );
      gate.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
      gate.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const letters = (siteName ?? "Admin").trim().split("");
  const underlineDelay =
    LETTER_BASE_DELAY + letters.length * LETTER_STEP_MS + 240;

  return (
    <main className="app-screen bg-bg text-foreground relative flex items-center justify-center overflow-hidden p-6">
      {/* Panggung dekoratif. */}
      <div className={styles.stage} aria-hidden="true">
        <div className={styles.aurora}>
          <div className={styles.auroraA} />
          <div className={styles.auroraB} />
          <div className={styles.auroraC} />
        </div>
        <div className={styles.starsSm} />
        <div className={styles.starsLg} />
        <div className={styles.grain} />
        <div className={styles.vignette} />
      </div>

      <MotionPage profile="utility" className="relative w-full max-w-md">
        {/* Wordmark kinetik: huruf terungkas satu per satu. */}
        <div className={styles.wordmark} aria-hidden="true">
          <div className={styles.wordmarkInner}>
            {letters.map((letter, index) =>
              letter === " " ? (
                <span key={`space-${index}`} className={styles.letterSpace} />
              ) : (
                <span
                  key={`${letter}-${index}`}
                  className={styles.letter}
                  style={{
                    animationDelay: `${LETTER_BASE_DELAY + index * LETTER_STEP_MS}ms`,
                  }}
                >
                  {letter.toLocaleUpperCase("id-ID")}
                </span>
              ),
            )}
            <span
              className={styles.wordmarkUnderline}
              style={{ animationDelay: `${underlineDelay}ms` }}
            />
          </div>
        </div>

        <div className={styles.perspective}>
          <div className={styles.gateEnter}>
            <div ref={gateRef} className={styles.gate}>
              <div className={styles.gateBody}>
                <div className={styles.crest}>
                  <SiteLogo name={siteName ?? "Admin"} url={logoUrl} size={52} />
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 72 72"
                    className={styles.crestRing2}
                  >
                    <circle cx="36" cy="36" r="34" pathLength="100" />
                  </svg>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 72 72"
                    className={styles.crestRing}
                  >
                    <circle cx="36" cy="36" r="34" pathLength="100" />
                  </svg>
                </div>

                <h1
                  className={`${styles.itemIn} text-center text-xl font-semibold tracking-tight`}
                  style={{ animationDelay: "120ms" }}
                >
                  {title}
                </h1>
                {subtitle && (
                  <p
                    className={`${styles.itemIn} text-muted mt-1 text-center text-sm`}
                    style={{ animationDelay: "200ms" }}
                  >
                    {subtitle}
                  </p>
                )}

                <div className="mt-6">{children}</div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`${styles.footnote} ${styles.itemIn}`}
          style={{ animationDelay: "540ms" }}
        >
          <span>Area Admin · {siteName ?? "Website"}</span>
          <Link href="/" className={styles.footnoteLink}>
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Kembali ke situs
          </Link>
        </div>
      </MotionPage>
    </main>
  );
}
