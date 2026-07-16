-- Compatibility step: introduce the nullable column first.
-- Population, collision repair, reserved-route protection, and constraints are
-- finalized by 20260716_member_slug_integrity.sql. Keeping this step small lets
-- databases that previously failed during the old unique-index build continue.

alter table public.members
  add column if not exists slug text;
