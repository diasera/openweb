"use client";

import type { FormEventHandler, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface InlineTextComposerProps {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  pending: boolean;
  placeholder: string;
  note?: string;
  hasError?: boolean;
  submitLabel?: string;
  submitIcon?: ReactNode;
  submitAriaLabel?: string;
}

/** Tampilan composer pill bersama untuk komentar dan pesan publik. */
export function InlineTextComposer({
  value,
  onValueChange,
  onSubmit,
  pending,
  placeholder,
  note,
  hasError = false,
  submitLabel = "Kirim",
  submitIcon,
  submitAriaLabel,
}: InlineTextComposerProps) {
  return (
    <form onSubmit={onSubmit}>
      <div className="border-border bg-surface flex items-center gap-2 rounded-full border p-1 pl-4">
        <input
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          maxLength={500}
          className="placeholder:text-muted min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm"
        />
        <Button
          type="submit"
          size="sm"
          disabled={pending || !value.trim()}
          aria-label={submitAriaLabel}
          className={cn(submitIcon && "w-9 shrink-0 px-0")}
        >
          {pending ? "…" : (submitIcon ?? submitLabel)}
        </Button>
      </div>
      {note && (
        <p
          className={cn(
            "mt-2 px-1 text-xs",
            hasError ? "text-danger" : "text-muted",
          )}
        >
          {note}
        </p>
      )}
    </form>
  );
}
