-- ============================================================================
-- TEMPLATE WEBSITE KOMUNITAS — Skema database Supabase (sumber kebenaran tunggal).
-- Jalankan seluruh isi file ini di: Supabase Dashboard > SQL Editor > New query.
-- Aman dijalankan ulang (idempotent) berkat "if not exists" / "create or replace".
--
-- Model keamanan:
--  * anon key (browser) HANYA boleh MEMBACA data publik (lihat RLS di bawah).
--  * Semua mutasi divalidasi server. Byte video/audio memakai signed upload URL;
--    metadata, pesan, tracking, dan aksi admin memakai service role setelah cek sesi.
--    Jadi tabel sensitif
--    (admins, messages, visitors, banned_ips) TIDAK punya policy anon sama sekali.
-- ============================================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---- Enum ------------------------------------------------------------------
do $$ begin
  create type media_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_type as enum ('photo', 'video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_source as enum ('public', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type admin_role as enum ('owner', 'admin');
exception when duplicate_object then null; end $$;

-- ---- Trigger updated_at (dipakai ulang beberapa tabel) ---------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ---- site_settings (singleton, dikendalikan menu Setting) ------------------
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  site_name text not null default 'Ruang Bersama',
  site_alternate_name text,
  site_url text,
  site_type text not null default 'community',
  locale text not null default 'id-ID',
  description text,
  tagline text,
  content_labels jsonb not null default '{"memberSingular":"anggota","memberPlural":"anggota","memberIdentifier":"Nomor identitas","memberCoreGroup":"Pengurus"}'::jsonb,
  hero_badge text,
  hero_title text,
  hero_show_title boolean not null default true,
  hero_subtitle text,
  hero_image_url text,
  hero_image_width integer,
  hero_image_height integer,
  logo_url text,
  favicon_url text,
  seo_image_url text,
  seo_indexing_enabled boolean not null default true,
  theme jsonb,
  social jsonb,
  contact_email text,
  contact_phone text,
  contact_address text,
  footer_text text,
  visi text,
  misi text[],
  google_site_verification text,
  bing_site_verification text,
  google_analytics_id text,
  google_adsense_client_id text,
  google_adsense_auto_ads boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint site_settings_hero_image_dimensions_check check (
    (hero_image_width is null and hero_image_height is null)
    or (
      hero_image_url is not null
      and hero_image_width is not null
      and hero_image_height is not null
      and hero_image_width between 1 and 20000
      and hero_image_height between 1 and 20000
    )
  )
);
drop trigger if exists trg_site_settings_updated on public.site_settings;
create trigger trg_site_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();

-- Migrasi data SEO lama SEBELUM kolomnya dihapus, sehingga deploy lama terima
-- bersih tanpa langkah manual: judul/deskripsi kustom lama otomatis pindah ke
-- tagline/description. Judul lama biasa berpola "Nama — Tagline", jadi bagian
-- setelah nama situs diambil sebagai tagline; tanpa pola itu, nilai utuhnya
-- yang dipakai. Idempoten: hanya berjalan bila kolom lama masih ada.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name = 'seo_home_title'
  ) then
    update public.site_settings
    set
      tagline = coalesce(
        nullif(btrim(split_part(seo_home_title, site_name || ' — ', 2)), ''),
        nullif(btrim(seo_home_title), ''),
        tagline
      ),
      description = coalesce(
        nullif(btrim(seo_home_description), ''),
        description
      )
    where id = 1;
  end if;
end
$$;

-- Kolom legacy yang sudah dilebur ke site_name/tagline/description (dedup
-- panel Setting); di-drop secara idempoten agar deploy lama ikut bersih.
alter table public.site_settings drop column if exists timezone;
alter table public.site_settings drop column if exists keywords;
alter table public.site_settings drop column if exists seo_home_title;
alter table public.site_settings drop column if exists seo_home_description;

-- ---- admins (owner + admin) ------------------------------------------------
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null,
  password_hash text not null,
  role admin_role not null default 'admin',
  permissions jsonb not null default '{}'::jsonb,
  avatar_url text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);
-- Username unik tanpa peduli huruf besar/kecil.
create unique index if not exists admins_username_lower_idx
  on public.admins (lower(username));
-- Setup owner pertama harus tetap tunggal walau dua request datang bersamaan.
create unique index if not exists admins_single_owner_idx
  on public.admins (role) where role = 'owner';
alter table public.admins
  add column if not exists session_version integer not null default 1;

-- JWT sesi membawa versi ini. Password baru atau akun yang dinonaktifkan
-- menaikkan versi sehingga seluruh sesi lama langsung ditolak server.
create or replace function public.bump_admin_session_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.password_hash is distinct from old.password_hash
    or (old.is_active and not new.is_active)
  then
    new.session_version := old.session_version + 1;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_admins_session_version on public.admins;
create trigger trg_admins_session_version before update on public.admins
  for each row execute function public.bump_admin_session_version();

-- ---- members (anggota) -----------------------------------------------------
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  slug text,
  name text not null,
  nim text,
  position text,                          -- jabatan (opsional)
  is_pengurus boolean not null default false, -- true = pengurus (ring merah)
  photo_url text,
  bio text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.members add column if not exists slug text;
-- Slug lama tetap dialihkan ke URL baru setelah nama anggota diganti.
alter table public.members
  add column if not exists previous_slugs text[] not null default '{}';

-- Aturan canonical URL profil. NFKD + rentang combining mark sama dengan
-- src/lib/utils/slug.ts; daftar reserved sama dengan ADMIN_MANAGED_PATHS.
create or replace function public.member_slug_base(input_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(
    nullif(
      trim(both '-' from regexp_replace(
        regexp_replace(
          normalize(lower(coalesce(input_text, '')), NFKD),
          U&'[\0300-\036f]',
          '',
          'g'
        ),
        '[^a-z0-9]+',
        '-',
        'g'
      )),
      ''
    ),
    'member'
  );
$$;

create or replace function public.member_reserved_slugs()
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select array[
    'admin', 'agenda', 'anggota', 'blog', 'login', 'media',
    'music', 'pengunjung', 'pesan', 'setting', 'setup'
  ]::text[];
$$;

create or replace function public.member_slug_is_reserved(candidate text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(trim(coalesce(candidate, ''))) = any(public.member_reserved_slugs());
$$;

-- Pertahankan slug valid yang sudah tersimpan; alokasikan sisanya terhadap
-- claimed set global agar nama bersuffix tidak bertabrakan dengan duplikat.
create or replace function public.reconcile_member_slugs()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  member_record record;
  base_slug text;
  candidate text;
  suffix integer;
begin
  lock table public.members in share row exclusive mode;

  drop table if exists pg_temp.webkelas_member_slug_plan;
  drop table if exists pg_temp.webkelas_member_slug_claimed;
  create temporary table webkelas_member_slug_plan (
    id uuid primary key,
    slug text not null unique
  ) on commit drop;
  create temporary table webkelas_member_slug_claimed (
    slug text primary key
  ) on commit drop;

  with existing as (
    select
      members.id,
      members.slug,
      row_number() over (
        partition by members.slug
        order by members.sort_order, members.created_at, members.id
      ) as occurrence
    from public.members as members
    where members.slug is not null
      and members.slug = trim(members.slug)
      and members.slug = lower(members.slug)
      and members.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      and not public.member_slug_is_reserved(members.slug)
  )
  insert into pg_temp.webkelas_member_slug_plan (id, slug)
  select id, slug
  from existing
  where occurrence = 1;

  insert into pg_temp.webkelas_member_slug_claimed (slug)
  select unnest(public.member_reserved_slugs());

  insert into pg_temp.webkelas_member_slug_claimed (slug)
  select slug from pg_temp.webkelas_member_slug_plan
  on conflict do nothing;

  for member_record in
    select members.id, members.name
    from public.members as members
    where not exists (
      select 1
      from pg_temp.webkelas_member_slug_plan as plan
      where plan.id = members.id
    )
    order by members.sort_order, members.created_at, members.id
  loop
    base_slug := public.member_slug_base(member_record.name);
    candidate := base_slug;
    suffix := 2;

    while exists (
      select 1
      from pg_temp.webkelas_member_slug_claimed as claimed
      where claimed.slug = candidate
    ) loop
      candidate := base_slug || '-' || suffix::text;
      suffix := suffix + 1;
    end loop;

    insert into pg_temp.webkelas_member_slug_plan (id, slug)
    values (member_record.id, candidate);
    insert into pg_temp.webkelas_member_slug_claimed (slug)
    values (candidate);
  end loop;

  update public.members as members
  set slug = plan.slug
  from pg_temp.webkelas_member_slug_plan as plan
  where members.id = plan.id
    and members.slug is distinct from plan.slug;

  if exists (
    select 1
    from public.members
    where slug is null
      or slug <> trim(slug)
      or slug <> lower(slug)
      or slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      or public.member_slug_is_reserved(slug)
  ) then
    raise exception 'Member slug reconciliation left a non-canonical slug';
  end if;

  if exists (
    select 1 from public.members group by slug having count(*) > 1
  ) then
    raise exception 'Member slug reconciliation left duplicate slugs';
  end if;
end;
$$;

select public.reconcile_member_slugs();

alter table public.members alter column slug set not null;
alter table public.members
  drop constraint if exists members_slug_canonical_check;
alter table public.members
  add constraint members_slug_canonical_check check (
    slug = trim(slug)
    and slug = lower(slug)
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and not public.member_slug_is_reserved(slug)
  );

do $$
begin
  if not exists (
    select 1
    from pg_index as indexes
    join pg_attribute as attribute
      on attribute.attrelid = indexes.indrelid
      and attribute.attnum = indexes.indkey[0]
    where indexes.indrelid = 'public.members'::regclass
      and indexes.indisunique
      and indexes.indpred is null
      and indexes.indexprs is null
      and indexes.indnkeyatts = 1
      and attribute.attname = 'slug'
  ) then
    create unique index members_slug_unique_idx on public.members (slug);
  end if;
end;
$$;

revoke all on function public.member_slug_base(text) from public, anon, authenticated;
revoke all on function public.reconcile_member_slugs() from public, anon, authenticated;
revoke all on function public.member_reserved_slugs() from public, anon, authenticated;
revoke all on function public.member_slug_is_reserved(text) from public, anon, authenticated;
grant execute on function public.member_reserved_slugs() to service_role;
grant execute on function public.member_slug_is_reserved(text) to service_role;

drop trigger if exists trg_members_updated on public.members;
create trigger trg_members_updated before update on public.members
  for each row execute function public.set_updated_at();
create index if not exists members_sort_idx on public.members (sort_order, created_at);

-- Satu sumber MIME storage per tipe media, dipakai constraint `media` dan
-- `media_slides` agar daftar format tidak ditulis ulang per tabel.
create or replace function public.media_mime_matches_type(
  p_type public.media_type,
  p_mime text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_mime is null
    or (
      p_type = 'photo' and p_mime in (
        'image/jpeg', 'image/png', 'image/apng', 'image/webp', 'image/gif',
        'image/avif'
      )
    )
    or (
      p_type = 'video' and p_mime in (
        'video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp'
      )
    );
$$;

-- ---- media (foto/video) ----------------------------------------------------
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  type media_type not null,
  title text,
  category text,
  url text not null,
  mime_type text,
  thumbnail_url text,
  caption text,
  uploader_name text,
  status media_status not null default 'pending',
  is_pinned boolean not null default false,
  allow_comments boolean not null default true,
  source media_source not null default 'public',
  width integer,
  height integer,
  ip_address text,
  reviewed_by uuid references public.admins(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.media add column if not exists mime_type text;
alter table public.media drop constraint if exists media_mime_type_matches_type;
alter table public.media add constraint media_mime_type_matches_type check (
  public.media_mime_matches_type(type, mime_type)
);
create index if not exists media_status_idx on public.media (status, created_at desc);
create index if not exists media_pinned_idx on public.media (is_pinned) where is_pinned;
-- Satu objek signed-upload hanya boleh difinalisasi menjadi satu baris media.
create unique index if not exists media_url_unique_idx on public.media (url);

-- ---- media_slides (carousel: item ke-2 dst. dalam satu pin) ----------------
-- Baris `media` tetap menjadi pin sekaligus slide pertama (sampul), sehingga
-- kartu, pencarian, album, feed, dan moderasi lama tidak berubah. Slide
-- tambahan hanya terbaca publik bila pin induknya approved (RLS di bawah).
-- Batas posisi = UPLOAD_LIMITS.mediaPerPost - 1 (dicek `npm run check:schema`).
create table if not exists public.media_slides (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media(id) on delete cascade,
  position smallint not null check (position between 1 and 9),
  type media_type not null,
  url text not null,
  mime_type text,
  thumbnail_url text,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  constraint media_slides_position_unique unique (media_id, position)
);
alter table public.media_slides drop constraint if exists media_slides_mime_type_matches_type;
alter table public.media_slides add constraint media_slides_mime_type_matches_type check (
  public.media_mime_matches_type(type, mime_type)
);
create unique index if not exists media_slides_url_unique_idx on public.media_slides (url);

-- Satu objek storage hanya boleh dimiliki satu slot (sampul atau slide). Unique
-- index menjaga tiap tabel; trigger ini menjaga lintas tabel. Advisory lock per
-- URL menyerialkan finalisasi bersamaan, jadi `exists` selalu melihat baris
-- pemenang yang sudah commit (replay tiket tidak bisa menggandakan objek).
create or replace function public.guard_media_object_url()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.url is not distinct from old.url then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.url, 0));
  if tg_table_name = 'media' then
    if exists (select 1 from public.media_slides where url = new.url) then
      raise exception using errcode = '23505', message = 'media object already referenced';
    end if;
  elsif exists (select 1 from public.media where url = new.url) then
    raise exception using errcode = '23505', message = 'media object already referenced';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_media_object_url() from public, anon, authenticated;
drop trigger if exists trg_media_object_url on public.media;
create trigger trg_media_object_url before insert or update of url on public.media
  for each row execute function public.guard_media_object_url();
drop trigger if exists trg_media_slides_object_url on public.media_slides;
create trigger trg_media_slides_object_url before insert or update of url on public.media_slides
  for each row execute function public.guard_media_object_url();

-- ---- comments (komentar pada pin/media) ----------------------------------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media(id) on delete cascade,
  author_name text,
  content text not null,
  ip_address text,
  user_agent text,
  device jsonb,
  created_at timestamptz not null default now()
);
create index if not exists comments_media_idx on public.comments (media_id, created_at);

-- ---- messages (pesan anonim) ----------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  ip_address text,
  user_agent text,
  device jsonb,
  likes integer not null default 0,
  is_read boolean not null default false,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_created_idx on public.messages (created_at desc);

-- ---- message_likes (dedup like per pengunjung, sisi server) ----------------
-- Penegak "1 like per pengunjung per pesan" di database; kolom messages.likes
-- tetap menjadi hitungan tampilan yang diinkremen setelah insert berhasil.
create table if not exists public.message_likes (
  message_id uuid not null references public.messages(id) on delete cascade,
  visitor_id text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, visitor_id)
);

-- Baris dedup dan penghitung tampilan berubah dalam satu transaksi, sehingga
-- keduanya tidak pernah menyimpang walau request gagal di tengah jalan.
create or replace function public.like_message(
  p_message_id uuid,
  p_visitor_id text
)
returns table (total_likes integer, newly_liked boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.message_likes (message_id, visitor_id)
  select p_message_id, p_visitor_id
  where exists (select 1 from public.messages where id = p_message_id)
  on conflict do nothing;

  if found then
    return query
      update public.messages as message
      set likes = message.likes + 1
      where message.id = p_message_id
      returning message.likes, true;
  else
    return query
      select message.likes, false
      from public.messages as message
      where message.id = p_message_id;
  end if;
end;
$$;
revoke all on function public.like_message(uuid, text)
  from public, anon, authenticated;
grant execute on function public.like_message(uuid, text) to service_role;

-- ---- visitors (pengunjung) -------------------------------------------------
create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null unique,
  ip_address text,
  user_agent text,
  device jsonb,
  location jsonb,
  notifications_enabled boolean not null default false,
  visit_count integer not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists visitors_bell_idx
  on public.visitors (notifications_enabled) where notifications_enabled;

-- ---- notifications ---------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  url text,
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists notifications_created_idx on public.notifications (created_at desc);

-- ---- push_subscriptions (kanal Web Push per perangkat) ---------------------
-- Satu pengunjung bisa punya banyak perangkat; endpoint unik agar upsert
-- aman saat langganan diperbarui browser (pushsubscriptionchange).
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_visitor_idx
  on public.push_subscriptions (visitor_id);

-- ---- blog_posts ------------------------------------------------------------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  category text,
  tags text[],
  content_html text not null default '',
  content_json jsonb,
  cover_image_url text,
  status post_status not null default 'draft',
  author_id uuid references public.admins(id) on delete set null,
  author_name text,
  views integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_blog_updated on public.blog_posts;
create trigger trg_blog_updated before update on public.blog_posts
  for each row execute function public.set_updated_at();
create index if not exists blog_status_idx on public.blog_posts (status, published_at desc);
-- Slug lama tetap dialihkan ke URL baru setelah judul artikel diganti.
alter table public.blog_posts
  add column if not exists previous_slugs text[] not null default '{}';

-- ---- music_tracks (playlist Dynamic Island) --------------------------------
create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  audio_url text not null,
  mime_type text,
  storage_path text not null unique,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.music_tracks add column if not exists mime_type text;
alter table public.music_tracks
  drop constraint if exists music_tracks_mime_type_check;
alter table public.music_tracks add constraint music_tracks_mime_type_check check (
  mime_type is null or mime_type in (
    'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/webm',
    'audio/flac', 'audio/wav'
  )
);
drop trigger if exists trg_music_tracks_updated on public.music_tracks;
create trigger trg_music_tracks_updated before update on public.music_tracks
  for each row execute function public.set_updated_at();
create index if not exists music_tracks_active_sort_idx
  on public.music_tracks (is_active, sort_order, created_at);

-- ---- member_mentions (indeks history tag anggota) -------------------------
create table if not exists public.member_mentions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  media_id uuid references public.media(id) on delete cascade,
  blog_post_id uuid references public.blog_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint member_mentions_one_target check (
    num_nonnulls(media_id, blog_post_id) = 1
  ),
  unique (member_id, media_id),
  unique (member_id, blog_post_id)
);
create index if not exists member_mentions_member_idx
  on public.member_mentions (member_id, created_at desc);

--- ---- events (agenda + hitung mundur Dynamic Island) -----------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text,
  location text,
  url text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  is_published boolean not null default true,
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_order check (ends_at is null or ends_at >= starts_at)
);
drop trigger if exists trg_events_updated on public.events;
create trigger trg_events_updated before update on public.events
  for each row execute function public.set_updated_at();
create index if not exists events_published_starts_idx
  on public.events (is_published, starts_at);

-- ---- albums (album per acara) --------------------------------------------
create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  previous_slugs text[] not null default '{}',
  title text not null check (char_length(title) between 1 and 120),
  description text,
  event_id uuid references public.events(id) on delete set null,
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_albums_updated on public.albums;
create trigger trg_albums_updated before update on public.albums
  for each row execute function public.set_updated_at();

alter table public.media
  add column if not exists album_id uuid references public.albums(id) on delete set null;
create index if not exists media_album_idx
  on public.media (album_id, created_at desc) where album_id is not null;

-- ---- banned_ips ------------------------------------------------------------
create table if not exists public.banned_ips (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null unique,
  reason text,
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---- rate_limits (pembatas atomik lintas instance serverless) --------------
create table if not exists public.rate_limits (
  scope text not null,
  key_hash text not null,
  request_count integer not null default 0 check (request_count >= 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (scope, key_hash)
);
create index if not exists rate_limits_reset_idx
  on public.rate_limits (reset_at);

create or replace function public.consume_rate_limit(
  p_scope text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_count integer;
  v_reset timestamptz;
begin
  if p_scope !~ '^[a-z0-9:_-]{1,64}$'
    or p_key_hash !~ '^[a-f0-9]{64}$'
    or p_limit < 1 or p_limit > 10000
    or p_window_seconds < 1 or p_window_seconds > 86400
  then
    raise exception 'invalid rate limit arguments';
  end if;

  delete from public.rate_limits
  where reset_at < v_now - interval '1 day';

  insert into public.rate_limits as current_limit (
    scope, key_hash, request_count, reset_at, updated_at
  ) values (
    p_scope,
    p_key_hash,
    1,
    v_now + make_interval(secs => p_window_seconds),
    v_now
  )
  on conflict (scope, key_hash) do update set
    request_count = case
      when current_limit.reset_at <= v_now then 1
      else least(current_limit.request_count + 1, p_limit + 1)
    end,
    reset_at = case
      when current_limit.reset_at <= v_now
        then v_now + make_interval(secs => p_window_seconds)
      else current_limit.reset_at
    end,
    updated_at = v_now
  returning request_count, reset_at into v_count, v_reset;

  return query select
    v_count <= p_limit,
    greatest(1, ceil(extract(epoch from (v_reset - v_now)))::integer);
end;
$$;

-- Tracking satu round-trip dan increment tidak hilang saat request bersamaan.
drop function if exists public.record_visitor_visit(uuid, text, text, jsonb);
drop function if exists public.record_visitor_visit(uuid, text, text, jsonb, text);
create or replace function public.record_visitor_visit(
  p_visitor_id uuid,
  p_ip_address text,
  p_user_agent text,
  p_device jsonb,
  p_visitor_rate_key_hash text,
  p_visitor_limit integer,
  p_visitor_window_seconds integer,
  p_ip_rate_key_hash text,
  p_ip_limit integer,
  p_ip_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visitor_allowed boolean;
  v_ip_allowed boolean;
begin
  select decision.allowed into v_visitor_allowed
  from public.consume_rate_limit(
    'public:track-visitor',
    p_visitor_rate_key_hash,
    p_visitor_limit,
    p_visitor_window_seconds
  ) as decision;
  if not coalesce(v_visitor_allowed, false) then
    return false;
  end if;
  select decision.allowed into v_ip_allowed
  from public.consume_rate_limit(
    'public:track-ip',
    p_ip_rate_key_hash,
    p_ip_limit,
    p_ip_window_seconds
  ) as decision;
  if not coalesce(v_ip_allowed, false) then
    return false;
  end if;

  insert into public.visitors as current_visitor (
    visitor_id, ip_address, user_agent, device
  ) values (
    p_visitor_id::text,
    p_ip_address,
    left(p_user_agent, 512),
    p_device
  )
  on conflict (visitor_id) do update set
    ip_address = coalesce(excluded.ip_address, current_visitor.ip_address),
    user_agent = coalesce(excluded.user_agent, current_visitor.user_agent),
    device = coalesce(excluded.device, current_visitor.device),
    visit_count = current_visitor.visit_count + 1,
    last_seen_at = now();
  return true;
end;
$$;

revoke all on table public.rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.rate_limits to service_role;
revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to service_role;
revoke all on function public.record_visitor_visit(
  uuid, text, text, jsonb, text, integer, integer, text, integer, integer
)
  from public, anon, authenticated;
grant execute on function public.record_visitor_visit(
  uuid, text, text, jsonb, text, integer, integer, text, integer, integer
)
  to service_role;

-- ---- Pencarian situs (bahasa Indonesia) -----------------------------------
-- Konfigurasi milik aplikasi: stemmer Indonesia bila tersedia ("berkemah" ->
-- "kemah"), selain itu simple. Satu nama agar fungsi tidak bergantung versi.
do $$
begin
  if not exists (
    select 1 from pg_ts_config
    where cfgname = 'app_search' and cfgnamespace = 'public'::regnamespace
  ) then
    if exists (select 1 from pg_ts_config where cfgname = 'indonesian') then
      create text search configuration public.app_search (copy = pg_catalog.indonesian);
    else
      create text search configuration public.app_search (copy = pg_catalog.simple);
    end if;
  end if;
end;
$$;

-- Spotlight: awalan kata (ketik "kem" -> "kemah") + cadangan substring.
-- SECURITY INVOKER: RLS dan grant kolom anon tetap berlaku.
create or replace function public.search_site(p_query text, p_limit integer default 5)
returns table (kind text, id uuid, title text, subtitle text, slug text)
language sql
stable
security invoker
set search_path = ''
as $$
  with input as (
    select
      left(btrim(coalesce(p_query, '')), 80) as raw,
      least(greatest(coalesce(p_limit, 5), 1), 10) as lim
  ), terms as (
    select
      raw,
      lim,
      (
        select string_agg(word || ':*', ' & ')
        from regexp_split_to_table(
          lower(regexp_replace(raw, '[^[:alnum:][:space:]]+', ' ', 'g')),
          '\s+'
        ) as word
        where word <> ''
      ) as prefix_query,
      '%' || replace(replace(replace(raw, '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
    from input
    where char_length(raw) >= 2
  ), q as (
    select
      lim,
      pattern,
      case
        when prefix_query is null then null
        else to_tsquery('public.app_search', prefix_query)
      end as ts
    from terms
  ), member_hits as (
    select 'member'::text as kind, l.id, l.name as title, l.position as subtitle,
      l.slug, coalesce(ts_rank(d.doc, q.ts), 0) as rank, 1 as kind_order
    from public.members as l
    cross join q
    cross join lateral (
      select to_tsvector('public.app_search',
        l.name || ' ' || coalesce(l.position, '')) as doc
    ) as d
    where (q.ts is not null and d.doc @@ q.ts)
      or l.name ilike q.pattern
      or l.nim ilike q.pattern
    order by rank desc, l.name
    limit (select lim from q)
  ), media_hits as (
    select 'media'::text as kind, m.id, coalesce(nullif(m.title, ''), 'Media') as title,
      m.category as subtitle, null::text as slug,
      coalesce(ts_rank(d.doc, q.ts), 0) as rank, 2 as kind_order
    from public.media as m
    cross join q
    cross join lateral (
      select to_tsvector('public.app_search',
        coalesce(m.title, '') || ' ' || coalesce(m.caption, '') || ' ' ||
        coalesce(m.category, '') || ' ' || coalesce(m.uploader_name, '')) as doc
    ) as d
    where m.status = 'approved'
      and (
        (q.ts is not null and d.doc @@ q.ts)
        or m.title ilike q.pattern
        or m.caption ilike q.pattern
      )
    order by rank desc, m.created_at desc
    limit (select lim from q)
  ), post_hits as (
    select 'blog'::text as kind, p.id, p.title, p.category as subtitle, p.slug,
      coalesce(ts_rank(d.doc, q.ts), 0) as rank, 3 as kind_order
    from public.blog_posts as p
    cross join q
    cross join lateral (
      select
        setweight(to_tsvector('public.app_search', p.title), 'A') ||
        setweight(to_tsvector('public.app_search', coalesce(p.excerpt, '')), 'B') ||
        setweight(to_tsvector('public.app_search', p.content_html), 'C') as doc
    ) as d
    where p.status = 'published'
      and (
        (q.ts is not null and d.doc @@ q.ts)
        or p.title ilike q.pattern
        or p.excerpt ilike q.pattern
      )
    order by rank desc, p.published_at desc nulls last
    limit (select lim from q)
  )
  select kind, id, title, subtitle, slug
  from (
    select * from member_hits
    union all select * from media_hits
    union all select * from post_hits
  ) as hits
  order by kind_order, rank desc;
$$;

-- "Kenangan hari ini": foto/video approved pada tanggal yang sama di tahun
-- sebelumnya, dihitung di zona waktu situs.
create or replace function public.media_on_this_day(
  p_time_zone text,
  p_limit integer default 12
)
returns table (
  id uuid, type public.media_type, title text, category text, url text,
  mime_type text, thumbnail_url text, caption text, uploader_name text,
  status public.media_status, is_pinned boolean, allow_comments boolean,
  source public.media_source, width integer, height integer,
  created_at timestamptz, album_id uuid
)
language sql
stable
security invoker
set search_path = ''
as $$
  with today as (
    select (now() at time zone p_time_zone)::date as local_day
  )
  select m.id, m.type, m.title, m.category, m.url, m.mime_type, m.thumbnail_url,
    m.caption, m.uploader_name, m.status, m.is_pinned, m.allow_comments,
    m.source, m.width, m.height, m.created_at, m.album_id
  from public.media as m
  cross join today as t
  where m.status = 'approved'
    and extract(month from (m.created_at at time zone p_time_zone)) = extract(month from t.local_day)
    and extract(day from (m.created_at at time zone p_time_zone)) = extract(day from t.local_day)
    and extract(year from (m.created_at at time zone p_time_zone)) < extract(year from t.local_day)
  order by m.created_at desc
  limit least(greatest(coalesce(p_limit, 12), 1), 30);
$$;

-- Kartu album publik: jumlah media approved + sampul dari media terbaru.
create or replace function public.album_summaries()
returns table (
  id uuid, slug text, title text, description text, event_id uuid,
  created_at timestamptz, updated_at timestamptz, media_count bigint,
  cover_url text, cover_type public.media_type, cover_thumbnail_url text,
  latest_media_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select a.id, a.slug, a.title, a.description, a.event_id, a.created_at, a.updated_at,
    count(m.id) as media_count,
    (array_agg(m.url order by m.created_at desc) filter (where m.id is not null))[1],
    (array_agg(m.type order by m.created_at desc) filter (where m.id is not null))[1],
    (array_agg(m.thumbnail_url order by m.created_at desc) filter (where m.id is not null))[1],
    max(m.created_at)
  from public.albums as a
  left join public.media as m
    on m.album_id = a.id and m.status = 'approved'
  group by a.id
  order by coalesce(max(m.created_at), a.created_at) desc;
$$;

-- Path objek gambar artikel (cover/inline) yang masih dirujuk artikel mana pun.
create or replace function public.blog_asset_paths_in_use(p_paths text[])
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select path
  from unnest(p_paths) as path
  where path <> ''
    and exists (
      select 1 from public.blog_posts as p
      where strpos(coalesce(p.cover_image_url, ''), path) > 0
        or strpos(p.content_html, path) > 0
    );
$$;

-- Minimisasi data (prinsip UU PDP): data teknis kedaluwarsa dihapus/dianonimkan.
-- Pengunjung yang masih berlangganan lonceng dipertahankan tanpa IP/perangkat.
create or replace function public.apply_data_retention(p_days integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff timestamptz;
begin
  if p_days is null or p_days < 30 or p_days > 3650 then
    raise exception 'invalid retention days';
  end if;
  v_cutoff := now() - make_interval(days => p_days);

  delete from public.visitors
  where last_seen_at < v_cutoff and not notifications_enabled;

  update public.visitors
  set ip_address = null, user_agent = null, device = null, location = null
  where last_seen_at < v_cutoff
    and (ip_address is not null or user_agent is not null
      or device is not null or location is not null);

  update public.comments
  set ip_address = null, user_agent = null, device = null
  where created_at < v_cutoff
    and (ip_address is not null or user_agent is not null or device is not null);

  update public.messages
  set ip_address = null, user_agent = null, device = null
  where created_at < v_cutoff
    and (ip_address is not null or user_agent is not null or device is not null);

  update public.media
  set ip_address = null
  where created_at < v_cutoff and ip_address is not null;

  -- Langganan push ikut aturan yang sama: info perangkat lama dianonimkan,
  -- dan langganan lama milik pengunjung yang barisnya sudah tiada dihapus.
  update public.push_subscriptions
  set user_agent = null
  where created_at < v_cutoff and user_agent is not null;

  delete from public.push_subscriptions as subscription
  where subscription.created_at < v_cutoff
    and not exists (
      select 1 from public.visitors as visitor
      where visitor.visitor_id = subscription.visitor_id
    );
end;
$$;

revoke all on function public.search_site(text, integer) from public;
revoke all on function public.media_on_this_day(text, integer) from public;
revoke all on function public.album_summaries() from public;
grant execute on function public.search_site(text, integer)
  to anon, authenticated, service_role;
grant execute on function public.media_on_this_day(text, integer)
  to anon, authenticated, service_role;
grant execute on function public.album_summaries()
  to anon, authenticated, service_role;
revoke all on function public.blog_asset_paths_in_use(text[])
  from public, anon, authenticated;
revoke all on function public.apply_data_retention(integer)
  from public, anon, authenticated;
grant execute on function public.blog_asset_paths_in_use(text[]) to service_role;
grant execute on function public.apply_data_retention(integer) to service_role;

-- ============================================================================
-- Row Level Security
-- Aktifkan RLS di SEMUA tabel. Hanya beri policy SELECT untuk data publik.
-- Tabel tanpa policy = tak bisa diakses anon (service role tetap bisa).
-- ============================================================================
alter table public.site_settings enable row level security;
alter table public.admins        enable row level security;
alter table public.members       enable row level security;
alter table public.media         enable row level security;
alter table public.messages      enable row level security;
alter table public.visitors      enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.message_likes enable row level security;
alter table public.blog_posts    enable row level security;
alter table public.banned_ips    enable row level security;
alter table public.comments      enable row level security;
alter table public.music_tracks  enable row level security;
alter table public.member_mentions enable row level security;
alter table public.rate_limits   enable row level security;
alter table public.events        enable row level security;
alter table public.albums        enable row level security;
alter table public.media_slides  enable row level security;

-- Baca publik: pengaturan situs
drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings
  for select using (true);

-- Baca publik: anggota
drop policy if exists "public read members" on public.members;
create policy "public read members" on public.members
  for select using (true);

-- Baca publik: HANYA media yang sudah di-approve
drop policy if exists "public read approved media" on public.media;
create policy "public read approved media" on public.media
  for select using (status = 'approved');

-- Baca publik: slide carousel HANYA untuk pin yang sudah di-approve
drop policy if exists "public read approved media slides" on public.media_slides;
create policy "public read approved media slides" on public.media_slides
  for select using (
    exists (
      select 1 from public.media m
      where m.id = media_slides.media_id and m.status = 'approved'
    )
  );

-- Baca publik: HANYA artikel yang published
drop policy if exists "public read published posts" on public.blog_posts;
create policy "public read published posts" on public.blog_posts
  for select using (status = 'published');

-- Baca publik: hanya lagu yang diaktifkan admin.
drop policy if exists "public read active music" on public.music_tracks;
create policy "public read active music" on public.music_tracks
  for select using (is_active = true);

-- Baca publik: hanya agenda yang diterbitkan admin.
drop policy if exists "public read published events" on public.events;
create policy "public read published events" on public.events
  for select using (is_published = true);

-- Baca publik: album (isinya tetap disaring RLS media approved).
drop policy if exists "public read albums" on public.albums;
create policy "public read albums" on public.albums
  for select using (true);

drop policy if exists "public read visible member mentions" on public.member_mentions;
create policy "public read visible member mentions" on public.member_mentions
  for select using (
    (media_id is not null and exists (
      select 1 from public.media m
      where m.id = member_mentions.media_id and m.status = 'approved'
    ))
    or
    (blog_post_id is not null and exists (
      select 1 from public.blog_posts p
      where p.id = member_mentions.blog_post_id and p.status = 'published'
    ))
  );

-- Baca publik: notifikasi (untuk lonceng pengunjung)
drop policy if exists "public read notifications" on public.notifications;
create policy "public read notifications" on public.notifications
  for select using (true);

-- Baca publik: komentar HANYA untuk media yang sudah approved
drop policy if exists "public read comments" on public.comments;
create policy "public read comments" on public.comments
  for select using (
    exists (
      select 1 from public.media m
      where m.id = comments.media_id and m.status = 'approved'
    )
  );

-- RLS membatasi BARIS, bukan KOLOM. Cabut SELECT tabel penuh agar anon tidak
-- dapat mengambil IP/device lewat PostgREST langsung dengan anon key.
revoke select on public.media, public.comments, public.blog_posts,
  public.notifications, public.music_tracks, public.events, public.albums,
  public.media_slides
  from public, anon, authenticated;

grant select (
  id, type, title, category, url, mime_type, thumbnail_url, caption, uploader_name,
  status, is_pinned, allow_comments, source, width, height, created_at, album_id
) on public.media to anon, authenticated;
grant select (
  id, media_id, position, type, url, mime_type, thumbnail_url, width, height,
  created_at
) on public.media_slides to anon, authenticated;
grant select (
  id, media_id, author_name, content, created_at
) on public.comments to anon, authenticated;
grant select (
  id, title, slug, excerpt, category, tags, content_html, cover_image_url,
  status, author_name, views, published_at, created_at, updated_at,
  previous_slugs
) on public.blog_posts to anon, authenticated;
grant select (
  id, title, body, url, created_at
) on public.notifications to anon, authenticated;
grant select (
  id, title, artist, audio_url, mime_type, duration_seconds, sort_order, is_active,
  created_at, updated_at
) on public.music_tracks to anon, authenticated;
grant select (
  id, title, description, location, url, starts_at, ends_at, is_published,
  created_at, updated_at
) on public.events to anon, authenticated;
grant select (
  id, slug, previous_slugs, title, description, event_id, created_at, updated_at
) on public.albums to anon, authenticated;

-- (Sengaja) tidak ada policy anon untuk: admins, messages, visitors, banned_ips.

-- ============================================================================
-- Migrasi kolom baru (aman dijalankan ulang pada database lama).
-- ============================================================================
alter table public.media        add column if not exists title text;
alter table public.media        add column if not exists category text;
alter table public.media        add column if not exists allow_comments boolean not null default true;
alter table public.members      add column if not exists is_pengurus boolean not null default false;
alter table public.blog_posts   add column if not exists category text;
alter table public.blog_posts   add column if not exists tags text[];
alter table public.blog_posts   add column if not exists author_name text;
alter table public.messages     add column if not exists likes integer not null default 0;
alter table public.messages     add column if not exists is_pinned boolean not null default false;
create index if not exists messages_pinned_idx
  on public.messages (created_at desc) where is_pinned;
alter table public.site_settings add column if not exists visi text;
alter table public.site_settings add column if not exists misi text[];
alter table public.site_settings add column if not exists hero_image_width integer;
alter table public.site_settings add column if not exists hero_image_height integer;

-- Label hero (chip kiri-atas) kini field sendiri di tab Beranda. Dulu isinya
-- ditebak dari nama alternatif/nama website sehingga bentrok dengan judul
-- hero. Saat kolom pertama kali dibuat, teks yang selama ini tampil disalin
-- sekali agar tampilan tidak berubah; setelah itu sepenuhnya milik admin.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name = 'hero_badge'
  ) then
    alter table public.site_settings add column hero_badge text;
    update public.site_settings
    set hero_badge = case
      when nullif(site_alternate_name, '') is not null
        and site_alternate_name <> coalesce(hero_title, site_name)
        then site_alternate_name
      when site_name <> coalesce(hero_title, site_name)
        then site_name
    end;
  end if;
end;
$$;

-- Sakelar judul hero di tab Beranda. Sebelumnya admin menyembunyikan judul
-- dengan mengisi simbol (mis. ".") sehingga h1 halaman depan ikut berisi
-- simbol itu. Saat kolom pertama kali dibuat, nilai tersebut dikonversi sekali
-- menjadi sakelar mati + judul kosong (h1 kembali memakai nama website).
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name = 'hero_show_title'
  ) then
    alter table public.site_settings
      add column hero_show_title boolean not null default true;
    update public.site_settings
    set hero_show_title = false, hero_title = null
    where hero_title is not null
      and btrim(hero_title) <> ''
      and hero_title !~ '[[:alnum:]]';
  end if;
end;
$$;

alter table public.site_settings
  drop constraint if exists site_settings_hero_image_dimensions_check;
alter table public.site_settings
  add constraint site_settings_hero_image_dimensions_check check (
    (hero_image_width is null and hero_image_height is null)
    or (
      hero_image_url is not null
      and hero_image_width is not null
      and hero_image_height is not null
      and hero_image_width between 1 and 20000
      and hero_image_height between 1 and 20000
    )
  );

-- ============================================================================
-- Storage buckets (public = true -> file bisa diakses lewat public URL).
-- Izin upload dibuat server sebagai signed URL satu-path; tak perlu policy insert anon.
-- media-inbox PRIVAT: semua direct upload media mendarat di sini dan baru
-- dipindah ke bucket publik `media` saat disetujui, jadi kiriman yang belum
-- dimoderasi tidak pernah punya URL publik.
-- file_size_limit = UPLOAD_LIMITS di src/lib/constants.ts (dicek
-- `npm run check:media-formats`): bucket media/music 500 MB, gambar 100 MB.
-- Global file size limit proyek tetap menang; paket Free maksimal 50 MB.
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('media',   'media',   true),
  ('media-inbox', 'media-inbox', false),
  ('music',   'music',   true),
  ('members', 'members', true),
  ('blog',    'blog',    true),
  ('site',    'site',    true)
on conflict (id) do nothing;

update storage.buckets
set
  public = true,
  file_size_limit = 524288000,
  allowed_mime_types = array[
    'audio/mpeg', 'audio/mp3', 'audio/x-mpeg',
    'audio/mp4', 'audio/x-m4a', 'audio/mp4a-latm',
    'audio/aac', 'audio/x-aac', 'audio/aacp',
    'audio/ogg', 'audio/opus', 'audio/vorbis', 'application/ogg',
    'audio/webm', 'audio/flac', 'audio/x-flac',
    'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/x-pn-wav'
  ]
where id = 'music';

update storage.buckets
set
  public = (id = 'media'),
  file_size_limit = 524288000,
  allowed_mime_types = array[
    'image/jpeg', 'image/pjpeg', 'image/png', 'image/apng',
    'image/webp', 'image/gif', 'image/avif', 'image/avif-sequence',
    'video/mp4', 'video/x-m4v', 'video/webm', 'video/quicktime',
    'video/3gpp', 'video/3gpp2'
  ]
where id in ('media', 'media-inbox');

update storage.buckets
set
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = array[
    'image/jpeg', 'image/pjpeg', 'image/png', 'image/apng',
    'image/webp', 'image/gif', 'image/avif', 'image/avif-sequence'
  ]
where id in ('members', 'blog', 'site');

-- ============================================================================
-- Seed: pastikan baris site_settings tunggal selalu ada.
-- ============================================================================
insert into public.site_settings (id, site_name, description, tagline)
values (
  1,
  'Ruang Bersama',
  'Ruang digital untuk profil, kegiatan, karya, artikel, dan informasi terbaru.',
  'Tumbuh bersama melalui cerita dan karya.'
)
on conflict (id) do nothing;
