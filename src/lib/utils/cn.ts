import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Token tema kustom dari globals.css harus didaftarkan: tanpa ini
 * tailwind-merge menganggap `text-caption2` sebagai warna teks dan
 * membuangnya saat digabung dengan `text-muted`. Jaga tetap sinkron.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "caption2",
        "caption1",
        "footnote",
        "subhead",
        "callout",
        "body",
        "headline",
        "title3",
        "title2",
        "title1",
        "large-title",
        "display",
      ],
      radius: ["ios", "ios-lg", "card", "pin"],
      shadow: ["ios", "ios-sm", "soft", "elevated"],
    },
  },
});

/**
 * Gabungkan className dengan aman: clsx untuk kondisi, tailwind-merge untuk
 * menyelesaikan konflik util Tailwind (mis. "px-2" + "px-4" -> "px-4").
 * Dipakai oleh SEMUA komponen UI.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
