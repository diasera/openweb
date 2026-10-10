import {
  BarChart3,
  Eye,
  Music2,
  Settings2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { DESTINATION_ICONS } from "@/components/public/destination-icons";
import { ADMIN_FEATURE_META, type AdminFeature } from "@/lib/constants";

export interface AdminFeaturePresentation {
  icon: LucideIcon;
  /** Satu kalimat fungsi fitur (kartu peluncur & header halaman). */
  description: string;
  /** Plat ikon berwarna penuh (fill tone + teks putih). */
  plate: string;
  /** Tint lembut tone yang sama untuk chip/badge. */
  tint: string;
}

/**
 * Pusat presentasi fitur admin: dasbor, header halaman, peluncur, dan
 * navigasi membaca peta yang sama sehingga ikon/warna tidak drift. Kelas tone
 * ditulis literal agar terbaca pemindai Tailwind. Label & href tetap milik
 * ADMIN_FEATURE_META (src/lib/constants.ts).
 */
export const ADMIN_FEATURE_PRESENTATION: Record<AdminFeature, AdminFeaturePresentation> = {
  stats: {
    icon: BarChart3,
    description: "Pantau aktivitas dan pertumbuhan website",
    plate: "bg-tone-blue text-white",
    tint: "bg-tone-blue/12 text-tone-blue-text",
  },
  pesan: {
    icon: DESTINATION_ICONS["/pesan"],
    description: "Baca, sematkan, dan moderasi pesan anonim",
    plate: "bg-tone-green text-white",
    tint: "bg-tone-green/12 text-tone-green-text",
  },
  media: {
    icon: DESTINATION_ICONS["/galeri"],
    description: "Tinjau kiriman, sorotan beranda, album, dan komentar",
    plate: "bg-tone-purple text-white",
    tint: "bg-tone-purple/12 text-tone-purple-text",
  },
  anggota: {
    icon: DESTINATION_ICONS["/anggota"],
    description: "Atur profil, foto, dan peran anggota",
    plate: "bg-tone-orange text-white",
    tint: "bg-tone-orange/12 text-tone-orange-text",
  },
  blog: {
    icon: DESTINATION_ICONS["/blog"],
    description: "Tulis, terbitkan, dan arsipkan artikel",
    plate: "bg-tone-pink text-white",
    tint: "bg-tone-pink/12 text-tone-pink-text",
  },
  agenda: {
    icon: DESTINATION_ICONS["/agenda"],
    description: "Jadwal acara dan hitung mundur di bilah atas",
    plate: "bg-tone-teal text-white",
    tint: "bg-tone-teal/12 text-tone-teal-text",
  },
  music: {
    icon: Music2,
    description: "Unggah audio dan susun playlist website",
    plate: "bg-tone-red text-white",
    tint: "bg-tone-red/12 text-tone-red-text",
  },
  pengunjung: {
    icon: Eye,
    description: "Lihat audiens, kirim notifikasi, batasi IP",
    plate: "bg-tone-cyan text-white",
    tint: "bg-tone-cyan/12 text-tone-cyan-text",
  },
  admin: {
    icon: ShieldCheck,
    description: "Akun pengelola dan hak akses per fitur",
    plate: "bg-tone-indigo text-white",
    tint: "bg-tone-indigo/12 text-tone-indigo-text",
  },
  setting: {
    icon: Settings2,
    description: "Identitas, beranda, SEO, dan integrasi",
    plate: "bg-tone-gray text-white",
    tint: "bg-tone-gray/12 text-tone-gray-text",
  },
};

export function adminFeatureLabel(feature: AdminFeature): string {
  return ADMIN_FEATURE_META[feature].label;
}
