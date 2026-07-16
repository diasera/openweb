-- Sinkronisasi format media untuk instalasi lama.
-- Sumber kontrak: src/lib/media-formats/registry.ts dan supabase/schema.sql.
-- Jalankan setelah 20260715_security_hardening.sql.

alter table public.media
  add column if not exists mime_type text;
alter table public.music_tracks
  add column if not exists mime_type text;

-- Normalisasi alias yang pernah dikirim browser menjadi MIME canonical yang
-- disimpan aplikasi. Nilai asing tidak ditebak; preflight di bawah menghentikan
-- migrasi agar operator dapat memeriksa data tersebut secara manual.
update public.media
set mime_type = case lower(split_part(trim(mime_type), ';', 1))
  when '' then null
  when 'image/pjpeg' then 'image/jpeg'
  when 'image/avif-sequence' then 'image/avif'
  when 'video/x-m4v' then 'video/mp4'
  when 'video/3gpp2' then 'video/3gpp'
  else lower(split_part(trim(mime_type), ';', 1))
end
where mime_type is not null;

update public.music_tracks
set mime_type = case lower(split_part(trim(mime_type), ';', 1))
  when '' then null
  when 'audio/mp3' then 'audio/mpeg'
  when 'audio/x-mpeg' then 'audio/mpeg'
  when 'audio/x-m4a' then 'audio/mp4'
  when 'audio/mp4a-latm' then 'audio/mp4'
  when 'audio/x-aac' then 'audio/aac'
  when 'audio/aacp' then 'audio/aac'
  when 'audio/opus' then 'audio/ogg'
  when 'audio/vorbis' then 'audio/ogg'
  when 'application/ogg' then 'audio/ogg'
  when 'audio/x-flac' then 'audio/flac'
  when 'audio/x-wav' then 'audio/wav'
  when 'audio/wave' then 'audio/wav'
  when 'audio/x-pn-wav' then 'audio/wav'
  else lower(split_part(trim(mime_type), ';', 1))
end
where mime_type is not null;

do $migration$
begin
  if exists (
    select 1
    from public.media
    where mime_type is not null
      and not (
        (type = 'photo' and mime_type in (
          'image/jpeg', 'image/png', 'image/apng', 'image/webp', 'image/gif',
          'image/avif'
        ))
        or
        (type = 'video' and mime_type in (
          'video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp'
        ))
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'Migrasi format media dibatalkan: media.mime_type berisi nilai asing atau tidak cocok dengan type.',
      hint = 'Periksa baris terkait dan gunakan MIME canonical dari registry sebelum menjalankan migrasi kembali.';
  end if;

  if exists (
    select 1
    from public.music_tracks
    where mime_type is not null
      and mime_type not in (
        'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/webm',
        'audio/flac', 'audio/wav'
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'Migrasi format media dibatalkan: music_tracks.mime_type berisi nilai asing.',
      hint = 'Periksa baris terkait dan gunakan MIME canonical dari registry sebelum menjalankan migrasi kembali.';
  end if;
end;
$migration$;

alter table public.media
  drop constraint if exists media_mime_type_matches_type;
alter table public.media add constraint media_mime_type_matches_type check (
  mime_type is null or
  (
    type = 'photo' and mime_type in (
      'image/jpeg', 'image/png', 'image/apng', 'image/webp', 'image/gif',
      'image/avif'
    )
  ) or
  (
    type = 'video' and mime_type in (
      'video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp'
    )
  )
);

alter table public.music_tracks
  drop constraint if exists music_tracks_mime_type_check;
alter table public.music_tracks add constraint music_tracks_mime_type_check check (
  mime_type is null or mime_type in (
    'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/webm',
    'audio/flac', 'audio/wav'
  )
);

-- Pastikan bucket lama ada, kemudian samakan limit serta seluruh alias MIME
-- direct-storage dengan registry. Format yang perlu normalisasi tidak diizinkan.
insert into storage.buckets (id, name, public)
values
  ('media',   'media',   true),
  ('music',   'music',   true),
  ('members', 'members', true),
  ('blog',    'blog',    true),
  ('site',    'site',    true)
on conflict (id) do nothing;

update storage.buckets
set
  public = true,
  file_size_limit = 52428800,
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
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = array[
    'image/jpeg', 'image/pjpeg', 'image/png', 'image/apng',
    'image/webp', 'image/gif', 'image/avif', 'image/avif-sequence',
    'video/mp4', 'video/x-m4v', 'video/webm', 'video/quicktime',
    'video/3gpp', 'video/3gpp2'
  ]
where id = 'media';

update storage.buckets
set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg', 'image/pjpeg', 'image/png', 'image/apng',
    'image/webp', 'image/gif', 'image/avif', 'image/avif-sequence'
  ]
where id in ('members', 'blog', 'site');

-- Security hardening sudah mencabut SELECT tabel penuh. Tambahkan hanya kolom
-- format baru ke grant publik yang aman.
grant select (mime_type) on public.media to anon, authenticated;
grant select (mime_type) on public.music_tracks to anon, authenticated;
