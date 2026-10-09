"use client";

import { useActionState } from "react";
import { setupOwnerAction, type AuthState } from "@/lib/auth/actions";
import {
  GroupedField,
  GroupLabel,
  groupedInputClass,
} from "@/components/ui/grouped-field";
import { MenuGroup } from "@/components/ui/menu-row";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthForm } from "./auth-form";

const INITIAL: AuthState = {};

/** Form setup owner pertama pada gerbang admin. */
export function SetupForm() {
  const [state, action, pending] = useActionState(setupOwnerAction, INITIAL);

  return (
    <AuthForm
      action={action}
      state={state}
      pending={pending}
      submitLabel="Buat owner & masuk"
      pendingLabel="Menyiapkan…"
    >
      {/* React 19 me-reset form sesudah action; nama & username dipulihkan
          dari state.values, password sengaja dikosongkan. */}
      <section aria-labelledby="setup-identity" className="space-y-2">
        <GroupLabel id="setup-identity">Identitas</GroupLabel>
        <MenuGroup>
          <GroupedField label="Nama" htmlFor="name">
            <input
              id="name"
              name="name"
              required
              maxLength={60}
              autoComplete="name"
              placeholder="Nama lengkap"
              defaultValue={state.values?.name}
              className={groupedInputClass}
            />
          </GroupedField>
          <GroupedField
            label="Username"
            htmlFor="username"
            trailing={
              <span id="username-hint" className="text-muted text-caption2">
                huruf, angka, . _ -
              </span>
            }
          >
            <input
              id="username"
              name="username"
              required
              maxLength={30}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-describedby="username-hint"
              placeholder="username"
              defaultValue={state.values?.username}
              className={groupedInputClass}
            />
          </GroupedField>
        </MenuGroup>
      </section>

      <section aria-labelledby="setup-security" className="space-y-2">
        <GroupLabel id="setup-security">Keamanan</GroupLabel>
        <MenuGroup>
          <GroupedField label="Password" htmlFor="password">
            <PasswordInput
              id="password"
              name="password"
              required
              maxLength={200}
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
              className={groupedInputClass}
            />
          </GroupedField>
          <GroupedField label="Ulangi password" htmlFor="confirm">
            <PasswordInput
              id="confirm"
              name="confirm"
              required
              maxLength={200}
              autoComplete="new-password"
              placeholder="Ketik ulang password"
              className={groupedInputClass}
            />
          </GroupedField>
        </MenuGroup>
      </section>
    </AuthForm>
  );
}
