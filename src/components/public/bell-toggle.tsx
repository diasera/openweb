"use client";

import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBellSubscription } from "./use-bell-subscription";

/** Tombol langganan notifikasi (lonceng) untuk pengunjung anonim. */
export function BellToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const bell = useBellSubscription(initialEnabled);

  return (
    <Button
      variant={bell.enabled ? "primary" : "outline"}
      size="sm"
      onClick={() => bell.setEnabled(!bell.enabled)}
      disabled={bell.pending}
    >
      {bell.enabled ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {bell.enabled ? "Aktif" : "Nyalakan"}
    </Button>
  );
}
