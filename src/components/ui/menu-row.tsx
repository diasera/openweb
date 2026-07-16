import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { MotionLink } from "@/components/motion";

/** Grup baris menu (kartu dengan pemisah). Dipakai hub Profil. */
export function MenuGroup({ children }: { children: ReactNode }) {
  return <Card className="divide-border divide-y overflow-hidden">{children}</Card>;
}

/** Satu baris menu: ikon + label + chevron. */
export function MenuRow({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <MotionLink
      href={href}
      className="hover:bg-surface-2 flex items-center gap-3 px-4 py-3.5 transition"
    >
      <span className="text-foreground">{icon}</span>
      <span className="flex-1 font-medium">{label}</span>
      <ChevronRight className="text-muted h-4 w-4" />
    </MotionLink>
  );
}
