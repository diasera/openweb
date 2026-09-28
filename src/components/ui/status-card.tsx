import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

/** Kartu status layar penuh bersama untuk 404, error rute, dan error global. */
export function StatusCard({
  code,
  title,
  description,
  children,
}: {
  code: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Card
      variant="elevated"
      className="rounded-ios-lg shadow-elevated w-full max-w-sm p-8 text-center"
    >
      {/* Angka status diisi mesh gradient tema (sama dengan hero tanpa foto). */}
      <p className="liquid-gradient font-display bg-clip-text text-7xl font-extrabold leading-none tracking-tight text-transparent forced-colors:bg-none forced-colors:text-[CanvasText]">
        {code}
      </p>
      <h1 className="font-display mt-3 text-xl font-bold">{title}</h1>
      <p className="text-muted mt-1 text-sm">{description}</p>
      {children && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {children}
        </div>
      )}
    </Card>
  );
}
