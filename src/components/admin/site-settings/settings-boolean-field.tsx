"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";

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
  return (
    <div className="bg-surface-2 flex items-center justify-between gap-4 rounded-2xl p-4">
      <input type="hidden" name={name} value={checked ? "on" : ""} />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-muted mt-0.5 text-xs leading-relaxed">{description}</p>
      </div>
      <Switch checked={checked} onChange={setChecked} label={title} />
    </div>
  );
}
