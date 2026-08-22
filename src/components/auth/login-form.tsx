"use client";

import { useActionState } from "react";
import { LoaderCircle } from "lucide-react";
import { loginAction, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthField } from "./auth-field";
import { Magnetic } from "./magnetic";
import { cn } from "@/lib/utils/cn";
import styles from "./auth-theater.module.css";

const INITIAL: AuthState = {};

/** Form login gerbang admin. `next` diteruskan secara aman ke server. */
export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(loginAction, INITIAL);

  return (
    <form
      action={action}
      className={cn(styles.formBody, state.error && styles.shake)}
    >
      {next && <input type="hidden" name="next" value={next} />}
      <AuthField label="Username" htmlFor="username" delay={300}>
        <Input
          id="username"
          name="username"
          required
          autoComplete="username"
          placeholder="username"
        />
      </AuthField>
      <AuthField label="Password" htmlFor="password" delay={380}>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </AuthField>

      {/* key agar teks error ter-animasi ulang tiap galat baru; nilai input
          tetap aman karena form tidak di-remount. */}
      {state.error && (
        <p key={state.error} className={styles.errorText}>
          {state.error}
        </p>
      )}

      <div className={styles.itemIn} style={{ animationDelay: "460ms" }}>
        <Magnetic>
          <Button
            type="submit"
            disabled={pending}
            className={cn("w-full", pending && styles.busy)}
          >
            {pending ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                Memverifikasi…
              </>
            ) : (
              "Masuk ke Dasbor"
            )}
          </Button>
        </Magnetic>
      </div>
    </form>
  );
}
