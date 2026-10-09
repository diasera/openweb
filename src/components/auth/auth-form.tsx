import type { ReactNode } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import type { AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import styles from "./auth-gate.module.css";

/**
 * Cangkang form gerbang Auth (login & setup owner): field dari pemanggil,
 * lalu pesan galat dan tombol kirim yang sama. Galat disembunyikan selama
 * pending sehingga galat berikutnya (meski teksnya sama) dipasang ulang:
 * form bergetar lagi dan role="alert" diumumkan lagi oleh pembaca layar.
 */
export function AuthForm({
  action,
  state,
  pending,
  submitLabel,
  pendingLabel,
  children,
}: {
  action: (formData: FormData) => void;
  state: AuthState;
  pending: boolean;
  submitLabel: string;
  pendingLabel: string;
  children: ReactNode;
}) {
  const error = pending ? undefined : state.error;

  return (
    <form action={action} className={cn("space-y-5", error && styles.shake)}>
      {children}

      {error && (
        <p
          role="alert"
          className="bg-danger/10 text-danger flex items-start gap-2 rounded-ios px-3.5 py-3 text-footnote font-medium leading-relaxed"
        >
          <CircleAlert className="mt-px size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            {pendingLabel}
          </>
        ) : (
          submitLabel
        )}
      </Button>
    </form>
  );
}
