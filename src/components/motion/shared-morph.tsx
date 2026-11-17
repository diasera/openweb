import { ViewTransition, type ReactNode } from "react";

/**
 * Pusat morph elemen bersama antar rute berbasis React 19.3 `<ViewTransition>`.
 * `default="none"` menahan animasi pada transisi lain yang tidak berkaitan,
 * sedangkan `share="morph"` memicu kurva pegas + blur optik hanya ketika ada
 * pasangan elemen bernama sama di rute asal dan rute tujuan.
 */
export function SharedMorph({
  name,
  enabled = true,
  children,
}: {
  name: string;
  enabled?: boolean;
  children: ReactNode;
}) {
  if (!enabled) return children;
  return (
    <ViewTransition name={name} share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
