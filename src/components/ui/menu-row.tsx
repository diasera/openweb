import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

/**
 * Grup baris ala Pengaturan iOS (kartu dengan pemisah). Dipakai field grup
 * Buat Pin dan gerbang Auth admin.
 */
export function MenuGroup({ children }: { children: ReactNode }) {
  return <Card className="divide-border divide-y overflow-hidden">{children}</Card>;
}
