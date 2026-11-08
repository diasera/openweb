import type { ReactNode } from "react";

/**
 * Field tanpa bingkai di dalam grup ala iOS Settings (dibungkus `MenuGroup`).
 * Satu bentuk untuk Buat Pin dan gerbang Auth admin; fokus ditandai latar baris.
 */
export const groupedInputClass =
  "placeholder:text-muted w-full bg-transparent text-base outline-hidden sm:text-subhead";

/** Judul kecil di atas grup field, seperti header section iOS. */
export function GroupLabel({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-muted px-4 text-footnote font-medium uppercase">
      {children}
    </h2>
  );
}

export function GroupedField({
  label,
  htmlFor,
  trailing,
  children,
}: {
  label: string;
  htmlFor: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="focus-within:bg-surface-2/40 px-4 py-3 transition-colors">
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-muted text-caption1 font-semibold">
          {label}
        </label>
        {trailing}
      </div>
      {children}
    </div>
  );
}
