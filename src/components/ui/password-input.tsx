"use client";

import {
  useState,
  type ComponentPropsWithRef,
  type KeyboardEvent,
} from "react";
import { ArrowBigUpDash, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type PasswordInputProps = Omit<ComponentPropsWithRef<"input">, "type">;

/**
 * Input password dengan tombol tampil/sembunyi dan penanda Caps Lock.
 * `className` mengatur input (mis. `groupedInputClass`); kontrolnya ikut
 * sebaris di kanan, jadi bingkai (bila ada) dipasang pada pembungkus luar,
 * bukan pada input. Dipakai field grup gerbang Auth.
 */
export function PasswordInput({
  className,
  onKeyDown,
  onKeyUp,
  onBlur,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  function syncCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"));
  }

  return (
    <div className="flex items-center gap-2">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn("min-w-0 flex-1", className)}
        onKeyDown={(event) => {
          syncCapsLock(event);
          onKeyDown?.(event);
        }}
        onKeyUp={(event) => {
          syncCapsLock(event);
          onKeyUp?.(event);
        }}
        onBlur={(event) => {
          setCapsLock(false);
          onBlur?.(event);
        }}
      />
      {/* Wilayah live selalu terpasang agar pembaca layar mengumumkan perubahan. */}
      <span aria-live="polite" className="shrink-0">
        {capsLock && (
          <span
            className="bg-warning/12 text-warning inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption2 font-semibold"
            title="Caps Lock aktif"
          >
            <ArrowBigUpDash className="size-3.5" aria-hidden="true" />
            Caps Lock
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Sembunyikan password" : "Tampilkan password"}
        aria-pressed={visible}
        disabled={props.disabled}
        className="motion-pressable text-muted hover:text-foreground grid size-8 shrink-0 place-items-center rounded-full disabled:opacity-40"
      >
        {visible ? (
          <EyeOff className="size-4.5" aria-hidden="true" />
        ) : (
          <Eye className="size-4.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
