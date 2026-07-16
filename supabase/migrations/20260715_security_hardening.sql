-- Hardening untuk instalasi yang sudah menjalankan schema/migrasi sebelumnya.
-- Jalankan file ini sebelum 20260715_web_media_formats.sql.
-- Seluruh pemeriksaan konflik ditempatkan paling awal agar tidak ada data yang
-- dihapus atau diubah otomatis ketika integritas lama perlu dibereskan manual.

do $migration$
declare
  owner_count bigint;
  duplicate_media_url_count bigint;
begin
  select count(*)
  into owner_count
  from public.admins
  where role = 'owner';

  if owner_count > 1 then
    raise exception using
      errcode = '23505',
      message = format(
        'Migrasi security hardening dibatalkan: ditemukan %s akun owner.',
        owner_count
      ),
      hint = 'Sisakan tepat satu owner melalui audit manual, lalu jalankan migrasi ini kembali.';
  end if;

  select count(*)
  into duplicate_media_url_count
  from (
    select url
    from public.media
    group by url
    having count(*) > 1
  ) as duplicate_urls;

  if duplicate_media_url_count > 0 then
    raise exception using
      errcode = '23505',
      message = format(
        'Migrasi security hardening dibatalkan: ditemukan %s URL media duplikat.',
        duplicate_media_url_count
      ),
      hint = 'Periksa referensi media duplikat tanpa menghapus objek Storage yang masih dipakai, lalu jalankan migrasi ini kembali.';
  end if;
end;
$migration$;

-- Menutup race setup owner dan replay finalisasi satu objek upload.
create unique index if not exists admins_single_owner_idx
  on public.admins (role) where role = 'owner';
create unique index if not exists media_url_unique_idx
  on public.media (url);

-- Kuota atomik lintas instance serverless. Hanya service_role yang boleh
-- menyentuh tabel maupun RPC; browser tidak menerima akses langsung.
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
alter table public.rate_limits enable row level security;

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

-- Hapus hanya signature tracking lama yang pernah dipakai aplikasi.
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

-- RLS membatasi baris, bukan kolom. Cabut SELECT tabel penuh agar metadata
-- internal tidak dapat diminta langsung menggunakan anon key.
revoke select on public.media, public.comments, public.blog_posts,
  public.notifications, public.music_tracks from public, anon, authenticated;

-- mime_type ditambahkan oleh migrasi berikutnya, sehingga daftar dasar ini
-- sengaja hanya menyebut kolom yang sudah tersedia pada instalasi lama.
grant select (
  id, type, title, category, url, thumbnail_url, caption, uploader_name,
  status, is_pinned, allow_comments, source, width, height, created_at
) on public.media to anon, authenticated;
grant select (
  id, media_id, author_name, content, created_at
) on public.comments to anon, authenticated;
grant select (
  id, title, slug, excerpt, category, tags, content_html, cover_image_url,
  status, author_name, views, published_at, created_at, updated_at
) on public.blog_posts to anon, authenticated;
grant select (
  id, title, body, url, created_at
) on public.notifications to anon, authenticated;
grant select (
  id, title, artist, audio_url, duration_seconds, sort_order, is_active,
  created_at, updated_at
) on public.music_tracks to anon, authenticated;
