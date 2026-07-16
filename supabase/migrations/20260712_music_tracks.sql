-- Playlist musik Dynamic Island. Aman dijalankan ulang di database lama.
create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  audio_url text not null,
  storage_path text not null unique,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_music_tracks_updated on public.music_tracks;
create trigger trg_music_tracks_updated before update on public.music_tracks
  for each row execute function public.set_updated_at();

create index if not exists music_tracks_active_sort_idx
  on public.music_tracks (is_active, sort_order, created_at);

alter table public.music_tracks enable row level security;
drop policy if exists "public read active music" on public.music_tracks;
create policy "public read active music" on public.music_tracks
  for select using (is_active = true);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'music',
  'music',
  true,
  52428800,
  array[
    'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg',
    'audio/wav', 'audio/x-wav', 'audio/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
