"use client";

import { useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { notifyFormChange } from "@/lib/hooks/use-form-dirty";

export function SettingsBooleanField({
  name,
  title,
  description,
  defaultChecked,
}: {
  name: string;
  title: string;
  description: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="bg-surface-2 flex items-center justify-between gap-4 rounded-2xl p-4">
      <input
        ref={inputRef}
        type="hidden"
        name={name}
        value={checked ? "on" : ""}
      />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-muted mt-0.5 text-xs leading-relaxed">{description}</p>
      </div>
      <Switch
        checked={checked}
        onChange={(next) => {
          setChecked(next);
          // Switch berupa <button>: tanpa ini guard "belum disimpan" buta.
          notifyFormChange(inputRef.current);
        }}
        label={title}
      />
    </div>
  );
}
