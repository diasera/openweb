"use client";

import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ToggleRow } from "@/components/ui/toggle-row";
import { useBellSubscription } from "./use-bell-subscription";

/** Kontrol preferensi notifikasi pengunjung di hub Profil. */
export function ProfilNotificationToggle({
  initialBell,
}: {
  initialBell: boolean;
}) {
  const bell = useBellSubscription(initialBell);

  return (
    <Card className="overflow-hidden">
      <ToggleRow
        icon={<Bell className="h-[18px] w-[18px]" />}
        label="Notifikasi"
        checked={bell.enabled}
        onChange={bell.setEnabled}
        disabled={bell.pending}
      />
    </Card>
  );
}
