"use client";

import { useActionState } from "react";
import { loginAction, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";

const INITIAL: AuthState = {};

/** Form login Profil Admin. `next` diteruskan secara aman ke server. */
export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, INITIAL);

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Username" htmlFor="username">
        <Input id="username" name="username" required autoComplete="username" placeholder="username" />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" required autoComplete="current-password" placeholder="Password" />
      </Field>

      {state.error && <p className="text-danger text-sm">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Masuk…" : "Masuk"}
      </Button>
    </form>
  );
}
