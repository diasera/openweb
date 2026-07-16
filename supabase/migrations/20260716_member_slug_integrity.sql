-- Repair and enforce canonical member profile slugs without changing valid URLs.
-- UUID profile URLs remain resolvable by the application and redirect here.

alter table public.members
  add column if not exists slug text;

/** Match JavaScript String.normalize("NFKD") plus combining-mark removal. */
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

/** Static child routes under /profil; kept in one database function. */
create or replace function public.member_reserved_slugs()
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select array[
    'admin', 'anggota', 'blog', 'login', 'media',
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

/**
 * Preserve one valid existing slug, then allocate every remaining row against
 * a global claimed set. Global allocation prevents Dimas/Dimas/Dimas 2 from
 * producing the same `dimas-2` candidate.
 */
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

alter table public.members
  alter column slug set not null;
alter table public.members
  drop constraint if exists members_slug_canonical_check;
alter table public.members
  add constraint members_slug_canonical_check check (
    slug = trim(slug)
    and slug = lower(slug)
    and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and not public.member_slug_is_reserved(slug)
  );

-- Avoid a second identical index when an inline UNIQUE constraint already exists.
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
