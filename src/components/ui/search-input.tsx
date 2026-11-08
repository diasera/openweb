"use client";

import { Search } from "lucide-react";
import { fieldClass } from "@/components/ui/input";

/** Input pencarian reusable dengan ikon kaca pembesar. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Cari…",
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <div className={fieldClass("within", "flex h-11 items-center gap-2 rounded-2xl px-3.5")}>
      <Search className="text-muted size-4.5 shrink-0" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label ?? placeholder}
        placeholder={placeholder}
        className="placeholder:text-muted w-full bg-transparent text-base outline-hidden sm:text-subhead"
      />
    </div>
  );
}
