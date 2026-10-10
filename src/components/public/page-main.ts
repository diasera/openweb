import { cn } from "@/lib/utils/cn";

/**
 * Kelas `<main>` halaman aplikasi. Dipakai PageShell dan kerangka pemuatan
 * (RouteSkeleton) agar kerangka berdiri tepat di posisi konten aslinya.
 */
export function pageMainClass(hideTabBar = false): string {
  return cn(
    "mx-auto max-w-2xl px-4 pt-4 md:max-w-4xl lg:max-w-5xl lg:px-6 lg:pt-6",
    hideTabBar ? "pb-10" : "pb-32",
  );
}
