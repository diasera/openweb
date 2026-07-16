import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function SettingsSection({
  id,
  title,
  description,
  icon,
  children,
}: {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-28 overflow-hidden">
      <div className="border-border flex gap-3 border-b p-5">
        <span className="bg-primary/10 text-primary-readable grid h-10 w-10 shrink-0 place-items-center rounded-2xl">
          {icon}
        </span>
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <p className="text-muted mt-0.5 text-sm leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="space-y-5 p-5">{children}</div>
    </Card>
  );
}

