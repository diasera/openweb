import type { SelectHTMLAttributes } from "react";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";

export function SelectField({
  label,
  hint,
  options,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <Field label={label} htmlFor={props.id} hint={hint}>
      <select
        className={cn(
          "border-border bg-surface text-foreground h-11 w-full rounded-2xl border px-4 text-sm outline-none focus:border-primary",
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

