import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const SIZES = {
  sm: { plate: "size-7.5 rounded-[9px]", icon: "size-4.25" },
  md: { plate: "size-11 rounded-[14px]", icon: "size-5.25" },
  lg: { plate: "size-13 rounded-2xl", icon: "size-6" },
} as const;

/**
 * Plat ikon berwarna ala Pengaturan iOS dengan material gloss. Warna datang
 * dari kelas tone pemanggil (mis. `bg-tone-orange text-white`), sehingga
 * preferensi Profil, banner notifikasi, dan admin berbagi satu bentuk.
 */
export function IconPlate({
  icon: Icon,
  className,
  size = "md",
}: {
  icon: LucideIcon;
  className: string;
  size?: keyof typeof SIZES;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("gloss grid shrink-0 place-items-center", SIZES[size].plate, className)}
    >
      <Icon className={SIZES[size].icon} strokeWidth={2.15} />
    </span>
  );
}
