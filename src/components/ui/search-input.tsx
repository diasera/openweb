"use client";

import { Search } from "lucide-react";

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
    <div className="border-border bg-surface flex h-11 items-center gap-2 rounded-2xl border px-3.5">
      <Search className="text-muted h-[18px] w-[18px] shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label ?? placeholder}
        placeholder={placeholder}
        className="placeholder:text-muted w-full bg-transparent text-base outline-none sm:text-[15px]"
      />
    </div>
  );
}
