import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Gabungkan className dengan aman: clsx untuk kondisi, tailwind-merge untuk
 * menyelesaikan konflik util Tailwind (mis. "px-2" + "px-4" -> "px-4").
 * Dipakai oleh SEMUA komponen UI.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
