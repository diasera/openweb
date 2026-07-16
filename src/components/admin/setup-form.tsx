"use client";

import { useActionState } from "react";
import { setupOwnerAction, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

const INITIAL: AuthState = {};

/** Form setup owner pertama pada area Profil Admin. */
export function SetupForm() {
  const [state, action, pending] = useActionState(setupOwnerAction, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <Field label="Nama" htmlFor="name">
        <Input id="name" name="name" required autoComplete="name" placeholder="Nama lengkap" />
      </Field>
      <Field label="Username" htmlFor="username" hint="Huruf, angka, titik, _ atau -">
        <Input id="username" name="username" required autoComplete="username" placeholder="username" />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" required autoComplete="new-password" placeholder="Minimal 8 karakter" />
      </Field>
      <Field label="Konfirmasi Password" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" required autoComplete="new-password" placeholder="Ulangi password" />
      </Field>

      {state.error && <p className="text-danger text-sm">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Menyiapkan…" : "Buat Owner & Masuk"}
      </Button>
    </form>
  );
}
