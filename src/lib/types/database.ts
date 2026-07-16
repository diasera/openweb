/**
 * Kontrak tipe database — sumber kebenaran tunggal yang dipakai ulang oleh
 * seluruh query, komponen, server action, dan Supabase client (pola sarang
 * laba-laba). Harus SELALU sinkron dengan supabase/schema.sql.
 *
 * Bentuk mengikuti tipe hasil generate Supabase (Row/Insert/Update) supaya
 * createClient<Database>() memberi autocomplete & type-safety.
 */

// ---- Enum bersama ---------------------------------------------------------
export type MediaStatus = "pending" | "approved" | "rejected";
export type MediaType = "photo" | "video";
export type MediaSource = "public" | "admin";
export type PostStatus = "draft" | "published" | "archived";
export type AdminRole = "owner" | "admin";
export type SiteType =
  | "class"
  | "school"
  | "campus"
  | "community"
  | "organization"
  | "business"
  | "portfolio"
  | "other";

// ---- Bentuk jsonb ---------------------------------------------------------
export interface DeviceInfo {
  browser?: string | null;
  browserVersion?: string | null;
  os?: string | null;
  osVersion?: string | null;
  device?: string | null; // vendor + model
  type?: string | null; // mobile | tablet | desktop | ...
}

export interface GeoInfo {
  country?: string | null;
  region?: string | null;
  city?: string | null;
}

/** Token tema = channel RGB, mis. { primary: "0 122 255" }. Di-override menu Setting. */
export type ThemeTokens = Record<string, string>;

/** Peta izin fitur per admin, mis. { media: true, setting: false }. */
export type FeaturePermissions = Record<string, boolean>;

/** Tautan publik yang dikonfigurasi satu kali dan dipakai footer/schema SEO. */
export type SocialLinks = Partial<
  Record<"instagram" | "youtube" | "tiktok" | "facebook" | "linkedin" | "x", string>
>;

/** Label konten agar satu template cocok untuk kelas, sekolah, dan organisasi. */
export interface ContentLabels {
  memberSingular?: string;
  memberPlural?: string;
  memberIdentifier?: string;
  memberCoreGroup?: string;
}

// ---- Baris tabel ----------------------------------------------------------
export type SiteSettingsRow = {
  id: number; // singleton = 1
  site_name: string;
  site_alternate_name: string | null;
  site_url: string | null;
  site_type: SiteType;
  locale: string;
  timezone: string;
  description: string | null;
  tagline: string | null;
  content_labels: ContentLabels | null;
  keywords: string[] | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_image_url: string | null;
  hero_image_width: number | null;
  hero_image_height: number | null;
  logo_url: string | null;
  favicon_url: string | null;
  seo_home_title: string | null;
  seo_home_description: string | null;
  seo_image_url: string | null;
  seo_indexing_enabled: boolean;
  theme: ThemeTokens | null;
  social: SocialLinks | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  footer_text: string | null;
  visi: string | null;
  misi: string[] | null;
  google_site_verification: string | null;
  bing_site_verification: string | null;
  google_analytics_id: string | null;
  google_adsense_client_id: string | null;
  google_adsense_auto_ads: boolean;
  updated_at: string;
}

export type AdminRow = {
  id: string;
  name: string;
  username: string;
  password_hash: string;
  role: AdminRole;
  permissions: FeaturePermissions;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export type MemberRow = {
  id: string;
  slug: string;
  name: string;
  nim: string | null;
  position: string | null; // jabatan (opsional)
  is_pengurus: boolean;
  photo_url: string | null;
  bio: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type MediaRow = {
  id: string;
  type: MediaType;
  title: string | null;
  category: string | null;
  url: string;
  mime_type: string | null;
  thumbnail_url: string | null;
  caption: string | null;
  uploader_name: string | null;
  status: MediaStatus;
  is_pinned: boolean;
  allow_comments: boolean;
  source: MediaSource;
  width: number | null;
  height: number | null;
  ip_address: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type MessageRow = {
  id: string;
  content: string;
  ip_address: string | null;
  user_agent: string | null;
  device: DeviceInfo | null;
  likes: number;
  is_read: boolean;
  is_pinned: boolean;
  created_at: string;
}

export type VisitorRow = {
  id: string;
  visitor_id: string;
  ip_address: string | null;
  user_agent: string | null;
  device: DeviceInfo | null;
  location: GeoInfo | null;
  notifications_enabled: boolean;
  visit_count: number;
  first_seen_at: string;
  last_seen_at: string;
}

export type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  created_by: string | null;
  created_at: string;
}

export type BlogPostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  tags: string[] | null;
  content_html: string;
  content_json: unknown | null;
  cover_image_url: string | null;
  status: PostStatus;
  author_id: string | null;
  author_name: string | null;
  views: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BannedIpRow = {
  id: string;
  ip_address: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export type CommentRow = {
  id: string;
  media_id: string;
  author_name: string | null;
  content: string;
  ip_address: string | null;
  user_agent: string | null;
  device: DeviceInfo | null;
  created_at: string;
}

export type MusicTrackRow = {
  id: string;
  title: string;
  artist: string | null;
  audio_url: string;
  mime_type: string | null;
  storage_path: string;
  duration_seconds: number | null;
  sort_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type MemberMentionRow = {
  id: string;
  member_id: string;
  media_id: string | null;
  blog_post_id: string | null;
  created_at: string;
}

export type RateLimitRow = {
  scope: string;
  key_hash: string;
  request_count: number;
  reset_at: string;
  updated_at: string;
}

// ---- Helper Insert/Update -------------------------------------------------
// Tipe hand-written tak bisa tahu kolom mana punya DEFAULT di SQL, jadi Insert
// dibuat Partial (kolom NOT NULL tanpa default tetap dijaga constraint DB saat
// runtime). Ini pendekatan pragmatis & DRY untuk tipe manual.
interface TableShape<Row> {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  // Wajib ada agar tipe cocok dengan GenericTable milik supabase-js. Kosong
  // karena kita tak memakai embedded join PostgREST (query dibuat manual).
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      site_settings: TableShape<SiteSettingsRow>;
      admins: TableShape<AdminRow>;
      members: TableShape<MemberRow>;
      media: TableShape<MediaRow>;
      messages: TableShape<MessageRow>;
      visitors: TableShape<VisitorRow>;
      notifications: TableShape<NotificationRow>;
      blog_posts: TableShape<BlogPostRow>;
      banned_ips: TableShape<BannedIpRow>;
      comments: TableShape<CommentRow>;
      music_tracks: TableShape<MusicTrackRow>;
      member_mentions: TableShape<MemberMentionRow>;
      rate_limits: TableShape<RateLimitRow>;
    };
    Views: Record<string, never>;
    Functions: {
      consume_rate_limit: {
        Args: {
          p_scope: string;
          p_key_hash: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: Array<{
          allowed: boolean;
          retry_after_seconds: number;
        }>;
      };
      record_visitor_visit: {
        Args: {
          p_visitor_id: string;
          p_ip_address: string | null;
          p_user_agent: string | null;
          p_device: DeviceInfo | null;
          p_visitor_rate_key_hash: string;
          p_visitor_limit: number;
          p_visitor_window_seconds: number;
          p_ip_rate_key_hash: string;
          p_ip_limit: number;
          p_ip_window_seconds: number;
        };
        Returns: boolean;
      };
    };
    Enums: {
      media_status: MediaStatus;
      media_type: MediaType;
      media_source: MediaSource;
      post_status: PostStatus;
      admin_role: AdminRole;
    };
  };
}
