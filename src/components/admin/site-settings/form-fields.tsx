import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

/**
 * Pasangan label + kontrol siap pakai untuk form Setting. Semua bentuk field
 * (teks, area, warna, pilihan) hidup di satu file agar markup tidak disalin
 * per section; batas panjang dialirkan dari SITE_CONFIG_LIMITS oleh pemanggil.
 */

type FieldMeta = { label: string; hint?: string; error?: string };

export function TextField({
  label,
  hint,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldMeta) {
  return (
    <Field label={label} htmlFor={props.id} hint={hint} error={error}>
      <Input aria-invalid={error ? true : undefined} {...props} />
    </Field>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldMeta) {
  return (
    <Field label={label} htmlFor={props.id} hint={hint} error={error}>
      <Textarea aria-invalid={error ? true : undefined} {...props} />
    </Field>
  );
}

export function ColorField({
  label,
  hint,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldMeta) {
  return (
    <Field label={label} htmlFor={props.id} hint={hint} error={error}>
      <input
        type="color"
        className={cn(
          "border-border h-11 w-full cursor-pointer rounded-2xl border bg-transparent p-1",
          className,
        )}
        {...props}
      />
    </Field>
  );
}

export function SelectField({
  label,
  hint,
  error,
  options,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> &
  FieldMeta & {
    options: ReadonlyArray<{ value: string; label: string }>;
  }) {
  return (
    <Field label={label} htmlFor={props.id} hint={hint} error={error}>
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
