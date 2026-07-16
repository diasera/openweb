"use client";

import { cn } from "@/lib/utils/cn";

/** Toggle iOS. Dipakai ToggleRow, pengaturan komentar, dan kontrol sejenis. */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      data-checked={checked}
      className={cn(
        "ios-switch relative h-7 w-[46px] shrink-0 rounded-full disabled:opacity-50",
        checked ? "bg-primary" : "bg-surface-2 border-border border",
      )}
    >
      <span
        className={cn(
          "ios-switch-thumb absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow",
        )}
      />
    </button>
  );
}
