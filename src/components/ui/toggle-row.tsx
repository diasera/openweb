"use client";

import type { ReactNode } from "react";
import { Switch } from "@/components/ui/switch";

/** Baris dengan toggle: ikon + label + Switch. Dipakai hub Profil. */
export function ToggleRow({
  icon,
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="text-foreground">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {description && (
          <span className="text-muted mt-0.5 block text-xs leading-snug">
            {description}
          </span>
        )}
      </span>
      <Switch
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        label={label}
      />
    </div>
  );
}
