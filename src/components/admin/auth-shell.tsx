import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { MotionPage } from "@/components/motion";

/** Kerangka terpusat untuk autentikasi admin di area Profil. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="app-screen bg-bg flex items-center justify-center p-6">
      <MotionPage profile="utility" className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="bg-primary mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl">
            🎓
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted mt-1 text-sm">{subtitle}</p>}
        </div>
        <Card className="p-6 sm:p-8">{children}</Card>
      </MotionPage>
    </main>
  );
}
