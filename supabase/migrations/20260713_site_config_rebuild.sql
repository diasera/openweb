-- Konfigurasi website generik dan terpusat. Aman dijalankan ulang.
alter table public.site_settings
  add column if not exists site_alternate_name text,
  add column if not exists site_url text,
  add column if not exists site_type text not null default 'community',
  add column if not exists locale text not null default 'id-ID',
  add column if not exists timezone text not null default 'Asia/Jakarta',
  add column if not exists content_labels jsonb not null default '{"memberSingular":"anggota","memberPlural":"anggota","memberIdentifier":"Nomor identitas","memberCoreGroup":"Pengurus"}'::jsonb,
  add column if not exists seo_home_title text,
  add column if not exists seo_home_description text,
  add column if not exists seo_image_url text,
  add column if not exists seo_indexing_enabled boolean not null default true,
  add column if not exists contact_phone text,
  add column if not exists contact_address text,
  add column if not exists bing_site_verification text,
  add column if not exists google_adsense_client_id text,
  add column if not exists google_adsense_auto_ads boolean not null default false;

-- Satukan field sosial lama ke satu objek agar tidak ada dua sumber kebenaran.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_settings'
      and column_name = 'instagram'
  ) then
    execute $migration$
      update public.site_settings
      set social = coalesce(social, '{}'::jsonb) ||
        case
          when nullif(trim(instagram), '') is null then '{}'::jsonb
          else jsonb_build_object(
            'instagram',
            case
              when instagram ~* '^https?://' then instagram
              else 'https://www.instagram.com/' || regexp_replace(instagram, '^@', '') || '/'
            end
          )
        end
    $migration$;
    execute 'alter table public.site_settings drop column instagram';
  end if;
end $$;

update public.site_settings
set
  site_type = coalesce(nullif(site_type, ''), 'community'),
  locale = coalesce(nullif(locale, ''), 'id-ID'),
  timezone = coalesce(nullif(timezone, ''), 'Asia/Jakarta'),
  content_labels = coalesce(content_labels, '{}'::jsonb) ||
    jsonb_build_object(
      'memberSingular', coalesce(content_labels->>'memberSingular', 'anggota'),
      'memberPlural', coalesce(content_labels->>'memberPlural', 'anggota'),
      'memberIdentifier', coalesce(content_labels->>'memberIdentifier', 'Nomor identitas'),
      'memberCoreGroup', coalesce(content_labels->>'memberCoreGroup', 'Pengurus')
    )
where id = 1;

