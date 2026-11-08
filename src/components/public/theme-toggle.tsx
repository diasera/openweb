"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils/cn";
import { STORAGE_KEYS, writeStorage } from "@/lib/utils/storage";

/**
 * Kelas `dark` di <html> (dipasang ThemeScript sebelum hidrasi) adalah satu-
 * satunya sumber kebenaran; setiap tombol tema berlangganan perubahannya.
 */
function subscribeTheme(listener: () => void) {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function isDarkTheme() {
  return document.documentElement.classList.contains("dark");
}

/** Tombol ganti tema terang/gelap. Menyimpan pilihan ke localStorage. */
export function ThemeToggle({ className }: { className?: string }) {
  const dark = useSyncExternalStore(subscribeTheme, isDarkTheme, () => false);

  function toggle() {
    const next = !isDarkTheme();
    document.documentElement.classList.toggle("dark", next);
    writeStorage(STORAGE_KEYS.theme, next ? "dark" : "light");
  }

  return (
    <IconButton
      onClick={toggle}
      aria-label={dark ? "Gunakan tema terang" : "Gunakan tema gelap"}
      aria-pressed={dark}
      title={dark ? "Tema terang" : "Tema gelap"}
      className={cn("motion-pressable", className)}
    >
      {dark ? (
        <Moon className="animate-control-pop size-4.5" />
      ) : (
        <Sun className="animate-control-pop size-4.5" />
      )}
    </IconButton>
  );
}
