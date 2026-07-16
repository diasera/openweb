import {
  BarChart3,
  Eye,
  Images,
  MessageSquare,
  Music2,
  Newspaper,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AdminFeature } from "@/lib/constants";

interface AdminFeaturePresentation {
  icon: LucideIcon;
  description: string;
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
    tone: "bg-[#007AFF]/10 text-[#007AFF] dark:bg-[#0A84FF]/20 dark:text-[#64D2FF]",
  },
  pesan: {
    icon: MessageSquare,
    description: "Baca dan pilih pesan anonim",
    tone: "bg-[#34C759]/10 text-[#248A3D] dark:bg-[#30D158]/20 dark:text-[#30D158]",
  },
  media: {
    icon: Images,
    description: "Tinjau foto dan video kiriman",
    tone: "bg-[#AF52DE]/10 text-[#8944AB] dark:bg-[#BF5AF2]/20 dark:text-[#BF5AF2]",
  },
  anggota: {
    icon: Users,
    description: "Atur data dan profil anggota",
    tone: "bg-[#FF9500]/10 text-[#C93400] dark:bg-[#FF9F0A]/20 dark:text-[#FF9F0A]",
  },
  blog: {
    icon: Newspaper,
    description: "Tulis dan terbitkan artikel website",
    tone: "bg-[#FF2D55]/10 text-[#D30F45] dark:bg-[#FF375F]/20 dark:text-[#FF375F]",
  },
  music: {
    icon: Music2,
    description: "Kelola audio dan urutan playlist website",
    tone: "bg-[#FF2D55]/10 text-[#D30F45] dark:bg-[#FF375F]/20 dark:text-[#FF375F]",
  },
  pengunjung: {
    icon: Eye,
    description: "Lihat audiens dan kirim notifikasi",
    tone: "bg-[#32ADE6]/10 text-[#0071A4] dark:bg-[#64D2FF]/20 dark:text-[#64D2FF]",
  },
  admin: {
    icon: Shield,
    description: "Kelola akun dan hak akses admin",
    tone: "bg-[#5856D6]/10 text-[#3634A3] dark:bg-[#5E5CE6]/20 dark:text-[#7D7AFF]",
  },
  setting: {
    icon: Settings,
    description: "Identitas, tema, SEO, dan tampilan",
    tone: "bg-[#8E8E93]/12 text-[#636366] dark:bg-[#AEAEB2]/20 dark:text-[#D1D1D6]",
  },
};
