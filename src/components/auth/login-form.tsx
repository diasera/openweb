"use client";

import { useActionState } from "react";
import { loginAction, type AuthState } from "@/lib/auth/actions";
import { GroupedField, groupedInputClass } from "@/components/ui/grouped-field";
import { MenuGroup } from "@/components/ui/menu-row";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthForm } from "./auth-form";

const INITIAL: AuthState = {};

/** Form login gerbang admin. `next` diteruskan ke server yang memvalidasinya. */
export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, INITIAL);

  return (
    <AuthForm
      action={action}
      state={state}
      pending={pending}
      submitLabel="Masuk"
      pendingLabel="Memverifikasi…"
    >
      {next && <input type="hidden" name="next" value={next} />}
      {/* React 19 me-reset form sesudah action; username dipulihkan dari
          state.values, password sengaja dikosongkan. */}
      <MenuGroup>
        <GroupedField label="Username" htmlFor="username">
          <input
            id="username"
            name="username"
            required
            maxLength={30}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="username"
            defaultValue={state.values?.username}
            className={groupedInputClass}
          />
        </GroupedField>
        <GroupedField label="Password" htmlFor="password">
          <PasswordInput
            id="password"
            name="password"
            required
            maxLength={200}
            autoComplete="current-password"
            placeholder="••••••••"
            className={groupedInputClass}
          />
        </GroupedField>
      </MenuGroup>
    </AuthForm>
  );
}
