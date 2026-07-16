-- Indeks history tag anggota + backfill konten lama. Aman dijalankan ulang.
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

alter table public.member_mentions enable row level security;
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

-- Token nama depan/belakang yang utuh; awalan umum “Muh.” diabaikan.
with member_terms as (
  select distinct
    m.id as member_id,
    token
  from public.members m
  cross join lateral regexp_split_to_table(
    trim(regexp_replace(lower(m.name), '[^a-z0-9]+', ' ', 'g')),
    '\s+'
  ) as term(token)
  where length(token) >= 3
    and token not in ('muh', 'muhammad', 'moh', 'mohammad', 'mohamad', 'mhd')
), media_text as (
  select
    id,
    ' ' || trim(regexp_replace(lower(concat_ws(
      ' ', title, category, caption, uploader_name
    )), '[^a-z0-9]+', ' ', 'g')) || ' ' as body
  from public.media
  where source = 'admin'
), blog_text as (
  select
    id,
    ' ' || trim(regexp_replace(lower(concat_ws(
      ' ', title, excerpt, category, array_to_string(tags, ' '),
      author_name, content_html
    )), '[^a-z0-9]+', ' ', 'g')) || ' ' as body
  from public.blog_posts
)
insert into public.member_mentions (member_id, media_id, blog_post_id)
select mt.member_id, content.media_id, content.blog_post_id
from member_terms mt
join (
  select id as media_id, null::uuid as blog_post_id, body from media_text
  union all
  select null::uuid, id, body from blog_text
) content on content.body like '% ' || mt.token || ' %'
on conflict do nothing;
