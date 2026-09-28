import {
  BarChart3,
  Eye,
  Music2,
  Settings,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { DESTINATION_ICONS } from "@/components/public/destination-icons";
import type { AdminFeature } from "@/lib/constants";

interface AdminFeaturePresentation {
  icon: LucideIcon;
  description: string;
  /** Ikon berwarna ala Pengaturan iOS dari token tone (AA di light & dark). */
  tone: string;
}

/** Presentasi fitur dipakai seluruh permukaan navigasi admin. */
export const ADMIN_FEATURE_PRESENTATION: Record<
  AdminFeature,
  AdminFeaturePresentation
> = {
  stats: {
    icon: BarChart3,
    description: "Pantau aktivitas dan pertumbuhan website",
    tone: "bg-tone-blue/12 text-tone-blue-text",
  },
  pesan: {
    icon: DESTINATION_ICONS["/pesan"],
    description: "Baca dan pilih pesan anonim",
    tone: "bg-tone-green/12 text-tone-green-text",
  },
  media: {
    icon: DESTINATION_ICONS["/galeri"],
    description: "Tinjau foto dan video kiriman",
    tone: "bg-tone-purple/12 text-tone-purple-text",
  },
  anggota: {
    icon: DESTINATION_ICONS["/anggota"],
    description: "Atur data dan profil anggota",
    tone: "bg-tone-orange/12 text-tone-orange-text",
  },
  blog: {
    icon: DESTINATION_ICONS["/blog"],
    description: "Tulis dan terbitkan artikel website",
    tone: "bg-tone-pink/12 text-tone-pink-text",
  },
  agenda: {
    icon: DESTINATION_ICONS["/agenda"],
    description: "Jadwal acara dan hitung mundur di bilah atas",
    tone: "bg-tone-teal/12 text-tone-teal-text",
  },
  music: {
    icon: Music2,
    description: "Kelola audio dan urutan playlist website",
    tone: "bg-tone-red/12 text-tone-red-text",
  },
  pengunjung: {
    icon: Eye,
    description: "Lihat audiens dan kirim notifikasi",
    tone: "bg-tone-cyan/12 text-tone-cyan-text",
  },
  admin: {
    icon: Shield,
    description: "Kelola akun dan hak akses admin",
    tone: "bg-tone-indigo/12 text-tone-indigo-text",
  },
  setting: {
    icon: Settings,
    description: "Identitas, tema, SEO, dan tampilan",
    tone: "bg-tone-gray/12 text-tone-gray-text",
  },
};
