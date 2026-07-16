"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils/cn";

/** Tombol ganti tema terang/gelap. Menyimpan pilihan ke localStorage. */
export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const current = document.documentElement.classList.contains("dark");
    setDark(current);
  }, []);

  function toggle() {
    const root = document.documentElement;
    const next = !root.classList.contains("dark");
    setDark(next);
    root.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
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
        <Moon className="animate-control-pop h-[18px] w-[18px]" />
      ) : (
        <Sun className="animate-control-pop h-[18px] w-[18px]" />
      )}
    </IconButton>
  );
}

/** Skrip anti-FOUC: pilihan tersimpan menang; selain itu ikuti tema perangkat. */
export function ThemeScript() {
  const js =
    "try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}";
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
