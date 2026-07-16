import type {
  SiteSettingsRow,
  MemberRow,
  MediaRow,
  MessageRow,
  BlogPostRow,
  CommentRow,
} from "@/lib/types/database";
import { DEFAULT_SITE_CONFIG } from "@/lib/site-config";
import { slugifyMemberName } from "@/lib/members/slug";

/**
 * Data demo netral dipakai saat Supabase belum dikonfigurasi supaya template
 * langsung hidup tanpa membawa identitas pemilik repository.
 */

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
const daysAgo = (d: number) => new Date(now - d * 86400_000).toISOString();

export const DEMO_SETTINGS: SiteSettingsRow = {
  id: 1,
  ...DEFAULT_SITE_CONFIG,
  site_alternate_name: "Template Komunitas Modern",
  site_url: null,
  tagline: "Tumbuh bersama melalui cerita, karya, dan kebersamaan.",
  keywords: ["komunitas", "kegiatan anggota", "cerita bersama", "karya anggota"],
  hero_title: "Cerita yang tumbuh bersama",
  hero_subtitle: "Satu ruang untuk profil, kegiatan, karya, dan kenangan.",
  hero_image_url: null,
  hero_image_width: null,
  hero_image_height: null,
  logo_url: null,
  favicon_url: null,
  seo_home_title: "Ruang Bersama — Profil, Kegiatan, dan Karya Anggota",
  seo_home_description:
    "Temukan profil anggota, dokumentasi kegiatan, karya, artikel, dan informasi terbaru dari komunitas kami.",
  seo_image_url: null,
  seo_indexing_enabled: true,
  theme: null,
  social: null,
  contact_email: null,
  contact_phone: null,
  contact_address: null,
  footer_text: "Dibuat untuk tumbuh bersama.",
  visi: "Menjadi ruang yang terbuka, kolaboratif, dan bermanfaat bagi seluruh anggota.",
  misi: [
    "Membangun komunikasi dan kolaborasi yang sehat.",
    "Memberi ruang bagi setiap anggota untuk berkarya.",
    "Menyelenggarakan kegiatan yang bermanfaat dan inklusif.",
    "Mendokumentasikan perjalanan serta pencapaian bersama.",
  ],
  google_site_verification: null,
  bing_site_verification: null,
  google_analytics_id: null,
  google_adsense_client_id: null,
  google_adsense_auto_ads: false,
  updated_at: daysAgo(1),
};

function member(
  id: string,
  name: string,
  nim: string,
  position: string,
  isPengurus: boolean,
  sort: number,
): MemberRow {
  return {
    id,
    slug: slugifyMemberName(name),
    name,
    nim,
    position,
    is_pengurus: isPengurus,
    photo_url: null,
    bio: null,
    sort_order: sort,
    created_at: daysAgo(30 - sort),
    updated_at: daysAgo(1),
  };
}

export const DEMO_MEMBERS: MemberRow[] = [
  member("m1", "Anggota Satu", "A-001", "Koordinator", true, 0),
  member("m2", "Anggota Dua", "A-002", "Wakil Koordinator", true, 1),
  member("m3", "Anggota Tiga", "A-003", "Sekretaris", true, 2),
  member("m4", "Anggota Empat", "A-004", "Bendahara", true, 3),
  member("m5", "Anggota Lima", "A-005", "Anggota", false, 4),
  member("m6", "Anggota Enam", "A-006", "Anggota", false, 5),
  member("m7", "Anggota Tujuh", "A-007", "Anggota", false, 6),
  member("m8", "Anggota Delapan", "A-008", "Anggota", false, 7),
  member("m9", "Anggota Sembilan", "A-009", "Anggota", false, 8),
  member("m10", "Anggota Sepuluh", "A-010", "Anggota", false, 9),
];

function media(
  id: string,
  type: "photo" | "video",
  title: string,
  caption: string,
  category: string,
  uploader: string,
  ratio: [number, number],
  pinned = false,
): MediaRow {
  return {
    id,
    type,
    title,
    category,
    url: "", // kosong -> MediaCard render placeholder pastel
    mime_type: type === "video" ? "video/mp4" : "image/jpeg",
    thumbnail_url: null,
    caption,
    uploader_name: uploader,
    status: "approved",
    is_pinned: pinned,
    allow_comments: true,
    source: "public",
    width: ratio[0],
    height: ratio[1],
    ip_address: null,
    reviewed_by: null,
    reviewed_at: daysAgo(2),
    created_at: hoursAgo(3 + Number(id.replace(/\D/g, "")) * 2),
  };
}

export const DEMO_MEDIA: MediaRow[] = [
  media("g1", "photo", "Pertemuan perdana", "Dokumentasi pertemuan perdana anggota yang penuh semangat.", "Kegiatan", "Anggota Satu", [3, 4], true),
  media("g2", "photo", "Makan bersama", "Momen santai untuk saling mengenal dan berbagi cerita.", "Kebersamaan", "Anggota Dua", [1, 1]),
  media("g3", "video", "Lomba persahabatan", "Cuplikan kegiatan olahraga dan permainan antartim.", "Prestasi", "Anggota Tiga", [3, 5]),
  media("g4", "photo", "Lokakarya kreatif", "Belajar dan membuat karya baru bersama fasilitator.", "Edukasi", "Anggota Empat", [4, 3]),
  media("g5", "photo", "Apresiasi anggota", "Merayakan pencapaian dan kontribusi anggota.", "Apresiasi", "Admin", [3, 4]),
  media("g6", "video", "Kegiatan luar ruang", "Dua hari penuh tantangan, tawa, dan kerja sama tim.", "Cerita", "Anggota Enam", [1, 1]),
  media("g7", "photo", "Aksi sosial", "Kegiatan berbagi dan memberi dampak bagi lingkungan sekitar.", "Sosial", "Anggota Tujuh", [4, 5]),
  media("g8", "photo", "Sesi berbagi", "Diskusi terbuka untuk bertukar pengalaman dan pengetahuan.", "Edukasi", "Anggota Delapan", [3, 4]),
];

function message(
  id: string,
  content: string,
  hours: number,
  likes: number,
  pinned = false,
): MessageRow {
  return {
    id,
    content,
    ip_address: null,
    user_agent: null,
    device: null,
    likes,
    is_read: false,
    is_pinned: pinned,
    created_at: hoursAgo(hours),
  };
}

export const DEMO_MESSAGES: MessageRow[] = [
  message(
    "p1",
    "Komunitas ini hangat sekali. Semoga terus kompak dan memberi dampak positif!",
    2,
    12,
    true,
  ),
  message(
    "p2",
    "Terima kasih sudah membuat ruang digital yang rapi dan mudah digunakan!",
    3,
    21,
    true,
  ),
  message("p3", "Kangen kumpul bareng.", 5, 4),
  message("p4", "Semoga kebersamaan kita selalu memberi cerita yang berkesan.", 6, 18),
  message("p5", "Kegiatan terakhir menyenangkan dan membuatku belajar hal baru.", 9, 7),
];

function post(
  id: string,
  title: string,
  slug: string,
  category: string,
  author: string,
  excerpt: string,
  html: string,
  tags: string[],
  days: number,
): BlogPostRow {
  return {
    id,
    title,
    slug,
    excerpt,
    category,
    tags,
    content_html: html,
    content_json: null,
    cover_image_url: null,
    status: "published",
    author_id: null,
    author_name: author,
    views: 0,
    published_at: daysAgo(days),
    created_at: daysAgo(days + 1),
    updated_at: daysAgo(days),
  };
}

export const DEMO_POSTS: BlogPostRow[] = [
  post(
    "b1",
    "Rangkuman Pertemuan Perdana",
    "rangkuman-pertemuan-perdana",
    "Kegiatan",
    "Tim Konten",
    "Cerita lengkap pertemuan perdana anggota yang penuh semangat.",
    "<p>Pertemuan perdana berlangsung meriah. Kami berkenalan, menyusun struktur pengurus, dan merancang program bersama.</p><h2>Agenda utama</h2><p>Pembentukan divisi dan sesi berbagi harapan tiap anggota.</p>",
    ["komunitas", "kegiatan"],
    5,
  ),
  post(
    "b2",
    "Tips Menyiapkan Presentasi yang Jelas",
    "tips-menyiapkan-presentasi",
    "Panduan",
    "Tim Konten",
    "Lima langkah sederhana untuk menyampaikan ide dengan percaya diri.",
    "<p>Presentasi terasa lebih ringan ketika pesan utamanya jelas.</p><h2>1. Tentukan tujuan</h2><p>Pilih satu ide utama yang ingin diingat audiens.</p><h2>2. Berlatih</h2><p>Ulang beberapa kali dan minta masukan.</p>",
    ["panduan", "komunikasi"],
    8,
  ),
  post(
    "b3",
    "Catatan dari Kegiatan Luar Ruang",
    "catatan-kegiatan-luar-ruang",
    "Cerita",
    "Anggota Enam",
    "Dua hari penuh tawa, tantangan, dan kerja sama.",
    "<p>Kegiatan luar ruang benar-benar mempererat kami. Dari permainan tim sampai sesi refleksi, semuanya berkesan.</p>",
    ["cerita", "kebersamaan"],
    12,
  ),
  post(
    "b4",
    "Kenapa Bergabung dengan Komunitas?",
    "kenapa-bergabung-dengan-komunitas",
    "Opini",
    "Anggota Satu",
    "Refleksi singkat tentang relasi, proses belajar, dan kontribusi.",
    "<p>Bergabung dengan komunitas bukan sekadar menambah relasi, tetapi juga kesempatan untuk bertumbuh, berbagi, dan memberi dampak.</p>",
    ["opini", "komunitas"],
    15,
  ),
];

function comment(id: string, mediaId: string, name: string, content: string, hours: number): CommentRow {
  return {
    id,
    media_id: mediaId,
    author_name: name,
    content,
    ip_address: null,
    user_agent: null,
    device: null,
    created_at: hoursAgo(hours),
  };
}

export const DEMO_COMMENTS: CommentRow[] = [
  comment("c1", "g1", "Pengunjung 1", "Seru sekali acaranya!", 1),
  comment("c2", "g1", "Pengunjung 2", "Semoga ada kegiatan seperti ini lagi.", 1),
  comment("c3", "g1", "Pengunjung 3", "Kompak terus semuanya!", 20),
  comment("c4", "g6", "Pengunjung 4", "Tantangannya seru dan berkesan.", 3),
  comment("c5", "g6", "Pengunjung 5", "Salah satu momen terbaik!", 3),
];
