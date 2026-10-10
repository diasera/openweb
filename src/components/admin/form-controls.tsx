"use client";

import {
  useRef,
  useState,
  type ComponentPropsWithRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Check } from "lucide-react";
import { Field } from "@/components/ui/field";
import { fieldClass, Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { notifyFormChange } from "@/lib/hooks/use-form-dirty";
import { cn } from "@/lib/utils/cn";

/**
 * Seluruh bentuk field form admin di satu file (pola sarang laba-laba):
 * Pengaturan, dialog anggota/acara/album/admin, dan editor artikel memakai
 * kontrol yang sama sehingga label, hint, galat, dan fokus selalu konsisten.
 * Batas panjang dialirkan pemanggil dari sumber tunggalnya (mis.
 * SITE_CONFIG_LIMITS) — tidak ada angka lokal di sini.
 */

type FieldMeta = { label: string; hint?: string; error?: string };

export function TextField({
  label,
  hint,
  error,
  ...props
}: ComponentPropsWithRef<"input"> & FieldMeta) {
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

/** Password dengan tombol tampil/sembunyi dan penanda Caps Lock, berbingkai field. */
export function PasswordField({
  label,
  hint,
  error,
  id,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & FieldMeta & { id: string }) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <div className={fieldClass("within", "flex h-11 items-center rounded-2xl pl-4 pr-1.5")}>
        <PasswordInput
          id={id}
          aria-invalid={error ? true : undefined}
          className="placeholder:text-muted bg-transparent text-base outline-hidden sm:text-subhead"
          {...props}
        />
      </div>
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
        className={fieldClass(
          "self",
          cn(
            "text-foreground h-11 w-full rounded-2xl px-4 text-base outline-hidden sm:text-sm",
            className,
          ),
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

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

/**
 * Warna: swatch (pemilih native), kode hex yang bisa diketik/ditempel, dan
 * palet cepat. Nilai yang dikirim ada di input tersembunyi `name`, sehingga
 * kode hex setengah jadi tidak pernah terkirim.
 */
export function ColorField({
  label,
  hint,
  error,
  id,
  name,
  defaultValue,
  presets = [],
  onValueChange,
}: FieldMeta & {
  id: string;
  name: string;
  defaultValue: string;
  presets?: readonly string[];
  onValueChange?: (hex: string) => void;
}) {
  const [value, setValue] = useState(defaultValue.toLowerCase());
  const [draft, setDraft] = useState(defaultValue.toLowerCase());
  const hiddenRef = useRef<HTMLInputElement>(null);

  function commit(next: string, notify = true) {
    const hex = next.toLowerCase();
    setValue(hex);
    setDraft(hex);
    onValueChange?.(hex);
    if (notify) notifyFormChange(hiddenRef.current);
  }

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error}>
      <input ref={hiddenRef} type="hidden" name={name} value={value} />
      <div className={fieldClass("within", "flex h-11 items-center gap-2.5 rounded-2xl pl-1.5 pr-3")}>
        <span
          className="relative size-8 shrink-0 overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(event) => commit(event.target.value, false)}
            aria-label={`Pemilih ${label.toLocaleLowerCase()}`}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </span>
        <input
          id={id}
          value={draft}
          maxLength={7}
          spellCheck={false}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            const next = event.target.value.trim();
            setDraft(next);
            if (HEX_PATTERN.test(next)) {
              setValue(next.toLowerCase());
              onValueChange?.(next.toLowerCase());
            }
          }}
          onBlur={() => setDraft(value)}
          className="min-w-0 flex-1 bg-transparent font-mono text-base uppercase outline-hidden sm:text-sm"
        />
      </div>
      {presets.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label={`Palet ${label.toLocaleLowerCase()}`}>
          {presets.map((preset) => {
            const active = preset.toLowerCase() === value;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => commit(preset)}
                aria-label={`Pakai ${preset}`}
                aria-pressed={active}
                className={cn(
                  "motion-pressable grid size-7 place-items-center rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] transition",
                  active && "ring-foreground ring-offset-surface ring-2 ring-offset-2",
                )}
                style={{ backgroundColor: preset }}
              >
                {active && <Check className="size-3.5 text-white drop-shadow" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </Field>
  );
}

/**
 * Baris sakelar ala Pengaturan iOS di dalam form. Switch berupa <button>,
 * jadi nilainya dibawa input tersembunyi dan perubahan diumumkan ke pelacak
 * "belum disimpan" lewat notifyFormChange.
 */
export function SwitchField({
  name,
  title,
  description,
  defaultChecked,
  onCheckedChange,
  icon,
}: {
  name: string;
  title: string;
  description?: ReactNode;
  defaultChecked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  icon?: ReactNode;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="bg-surface-2/70 border-border/60 flex items-center gap-3 rounded-2xl border p-3.5">
      <input ref={inputRef} type="hidden" name={name} value={checked ? "on" : ""} />
      {icon && (
        <span className="bg-surface text-muted grid size-9 shrink-0 place-items-center rounded-xl shadow-soft">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {description && (
          <p className="text-muted mt-0.5 text-xs leading-relaxed">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        label={title}
        onChange={(next) => {
          setChecked(next);
          onCheckedChange?.(next);
          notifyFormChange(inputRef.current);
        }}
      />
    </div>
  );
}

/** Kartu pilihan centang (izin fitur, opsi publikasi). */
export function ChoiceChip({
  name,
  label,
  description,
  defaultChecked,
  icon,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked?: boolean;
  icon?: ReactNode;
}) {
  return (
    <label className="border-border hover:bg-surface-2/60 has-checked:border-primary/50 has-checked:bg-primary/6 group/choice flex cursor-pointer items-center gap-2.5 rounded-2xl border p-3 transition-colors">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      {icon && (
        <span className="text-muted group-has-checked/choice:text-primary-readable shrink-0">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {description && (
          <span className="text-muted block text-caption1 leading-snug">{description}</span>
        )}
      </span>
      <span
        aria-hidden="true"
        className="border-border bg-surface group-has-checked/choice:bg-primary group-has-checked/choice:border-primary grid size-5 shrink-0 place-items-center rounded-md border text-white transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-readable"
      >
        <Check className="size-3.5 opacity-0 transition-opacity group-has-checked/choice:opacity-100" />
      </span>
    </label>
  );
}

/**
 * Kartu bagian form: ikon tone, judul, deskripsi, lalu isi. Dipakai tab
 * Pengaturan dan editor artikel.
 */
export function FormSection({
  id,
  title,
  description,
  icon,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className={cn(
        "border-border bg-surface shadow-soft scroll-mt-28 overflow-hidden rounded-card border",
        className,
      )}
    >
      <header className="border-border/70 flex items-start gap-3 border-b px-5 py-4">
        {icon && (
          <span className="bg-primary/10 text-primary-readable grid size-10 shrink-0 place-items-center rounded-2xl">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 id={id ? `${id}-title` : undefined} className="font-display text-lg font-bold">
            {title}
          </h2>
          {description && (
            <p className="text-muted mt-0.5 text-sm leading-relaxed">{description}</p>
          )}
        </div>
      </header>
      <div className="space-y-5 p-5">{children}</div>
    </section>
  );
}

/** Sub-judul pemisah di dalam FormSection. */
export function FieldGroup({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-border/70 space-y-4 border-t pt-5", className)}>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-muted mt-0.5 text-xs leading-relaxed">{description}</p>}
      </div>
      {children}
    </div>
  );
}
