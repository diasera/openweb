-- Simpan rasio intrinsik file hero final agar renderer tidak memotong ulang
-- hasil editor. NULL/NULL tetap diizinkan untuk URL lama yang belum dibackfill.

alter table public.site_settings
  add column if not exists hero_image_width integer;
alter table public.site_settings
  add column if not exists hero_image_height integer;

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
