import type { ReactNode } from "react";

/** Pembungkus field form: label + kontrol + hint/error. Konsisten di semua form. */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label?: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-muted text-xs">{hint}</p>}
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}
