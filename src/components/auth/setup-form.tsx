"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { setupOwnerAction, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthField } from "./auth-field";
import { Magnetic } from "./magnetic";
import { cn } from "@/lib/utils/cn";
import styles from "./auth-theater.module.css";

const INITIAL: AuthState = {};

/** Form setup owner pertama pada gerbang admin. */
export function SetupForm() {
  const [state, action, pending] = useActionState(setupOwnerAction, INITIAL);

  return (
    <form
      action={action}
      className={cn(styles.formBody, state.error && styles.shake)}
    >
      <AuthField label="Nama" htmlFor="name" delay={300}>
        <Input
          id="name"
          name="name"
          required
          autoComplete="name"
          placeholder="Nama lengkap"
        />
      </AuthField>
      <AuthField
        label="Username"
        htmlFor="username"
        hint="Huruf, angka, titik, _ atau -"
        delay={360}
      >
        <Input
          id="username"
          name="username"
          required
          autoComplete="username"
          placeholder="username"
        />
      </AuthField>
      <AuthField label="Password" htmlFor="password" delay={420}>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
        />
      </AuthField>
      <AuthField label="Konfirmasi Password" htmlFor="confirm" delay={480}>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Ulangi password"
        />
      </AuthField>

      {state.error && (
        <p key={state.error} className={styles.errorText}>
          {state.error}
        </p>
      )}

      <div className={styles.itemIn} style={{ animationDelay: "560ms" }}>
        <Magnetic>
          <Button
            type="submit"
            disabled={pending}
            className={cn("w-full", pending && styles.busy)}
          >
            {pending ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                Menyiapkan…
              </>
            ) : (
              "Buat Owner & Masuk"
            )}
          </Button>
        </Magnetic>
      </div>
    </form>
  );
}
