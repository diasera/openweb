import type { ReactNode } from "react";
import styles from "./auth-theater.module.css";

/**
 * Field gerbang: label + kontrol + bingkai empat sisi yang menyala
 * menggambar dirinya saat fokus (murni CSS :focus-within). Dipakai ulang
 * oleh form login & setup — jangan tulis ulang per-form.
 */
export function AuthField({
  label,
  htmlFor,
  hint,
  error,
  delay = 0,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  delay?: number;
  children: ReactNode;
}) {
  return (
    <div
      className={`${styles.field} ${styles.itemIn}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <label htmlFor={htmlFor} className={styles.label}>
        {label}
      </label>
      <div className={styles.traceBox}>
        {children}
        <span aria-hidden="true" className={styles.traceTop} />
        <span aria-hidden="true" className={styles.traceRight} />
        <span aria-hidden="true" className={styles.traceBottom} />
        <span aria-hidden="true" className={styles.traceLeft} />
      </div>
      {hint && !error && <p className="text-muted text-xs">{hint}</p>}
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}
