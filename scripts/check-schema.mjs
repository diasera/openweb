import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

/**
 * Jalankan supabase/schema.sql DUA KALI di Postgres sungguhan (PGlite/WASM)
 * untuk membuktikan idempoten, lalu uji fungsi, RLS, dan grant penting
 * sebagai role `anon` — sama seperti klien publik Supabase.
 */
const schema = await readFile("supabase/schema.sql", "utf8");
const db = new PGlite({ extensions: { pgcrypto } });

// Objek bawaan Supabase yang tidak ada di Postgres polos.
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  create schema storage;
  create table storage.buckets (
    id text primary key, name text not null, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]
  );
`);

for (const run of [1, 2]) {
  try {
    await db.exec(schema);
  } catch (error) {
    const position = Number(error.position ?? 0);
    const near = position ? schema.slice(Math.max(0, position - 160), position + 80) : "";
    throw new Error(`schema.sql gagal pada run ${run}: ${error.message}\n${near}`);
  }
}

const rows = async (sql, params) => (await db.query(sql, params)).rows;
const asRole = async (role, sql, params) => {
  await db.exec(`set role ${role}`);
  try {
    return await rows(sql, params);
  } finally {
    await db.exec("reset role");
  }
};
const rejects = async (role, sql, pattern) => {
  await assert.rejects(asRole(role, sql), pattern);
};

// Bucket privat inbox untuk kiriman yang belum dimoderasi.
const buckets = await rows("select id, public from storage.buckets order by id");
assert.ok(buckets.some((b) => b.id === "media-inbox" && b.public === false), "bucket inbox harus privat");

// Rate limit atomik.
const limit = await rows(`
  select (select allowed from public.consume_rate_limit('t:x', repeat('a', 64), 2, 60)) as a1,
         (select allowed from public.consume_rate_limit('t:x', repeat('a', 64), 2, 60)) as a2,
         (select allowed from public.consume_rate_limit('t:x', repeat('a', 64), 2, 60)) as a3`);
assert.deepEqual(limit[0], { a1: true, a2: true, a3: false });

// Like pesan: satu pengunjung satu like, counter atomik.
await db.exec("insert into public.messages (content) values ('halo')");
const [{ id: messageId }] = await rows("select id from public.messages limit 1");
await rows("select * from public.like_message($1, 'v1')", [messageId]);
await rows("select * from public.like_message($1, 'v1')", [messageId]);
const liked = await rows("select * from public.like_message($1, 'v2')", [messageId]);
assert.equal(liked[0].total_likes, 2);

// Versi sesi admin naik hanya saat password/aktif berubah.
await db.exec(`
  insert into public.admins (name, username, password_hash, role) values ('Owner', 'owner', 'x', 'owner');
  update public.admins set name = 'Owner 2' where username = 'owner';
  update public.admins set password_hash = 'y' where username = 'owner';`);
const [{ session_version }] = await rows("select session_version from public.admins where username = 'owner'");
assert.equal(session_version, 2);

// Data uji konten publik.
await db.exec(`
  insert into public.members (name, slug, position, nim) values ('Siti Sholeh', 'siti-sholeh', 'Ketua', '2301');
  insert into public.media (type, title, caption, url, status, created_at) values
    ('photo', 'Kemah Bakti', 'Api unggun', 'https://x/media/a.jpg', 'approved', now() - interval '1 year'),
    ('photo', 'Rapat', 'Rapat rutin', 'https://x/media/b.jpg', 'approved', now()),
    ('photo', 'Kemah rahasia', 'pending', 'https://x/media/c.jpg', 'pending', now() - interval '2 years');
  insert into public.blog_posts (title, slug, excerpt, content_html, status, published_at) values
    ('Berkemah di Gunung', 'berkemah-di-gunung', 'Cerita', '<p>Kegiatan berkemah <img src="https://x/storage/v1/object/public/blog/in-abc.webp"></p>', 'published', now()),
    ('Draft kemah', 'draft-kemah', null, '<p>rahasia</p>', 'draft', null);`);

// Pencarian: awalan kata + stemming Indonesia; draf/pending tidak bocor.
const search = await asRole("anon", "select kind, title from public.search_site('kem', 5)");
assert.deepEqual(
  search.map((r) => r.title).sort(),
  ["Berkemah di Gunung", "Kemah Bakti"],
  "pencarian anon hanya konten publik",
);
const byNim = await asRole("anon", "select kind from public.search_site('2301', 5)");
assert.deepEqual(byNim.map((r) => r.kind), ["member"]);
await asRole("anon", "select * from public.search_site($1, 5)", ["100% & (a|b) :* '"]);

// Kenangan hari ini: hanya approved dari tahun sebelumnya.
const memories = await asRole("anon", "select title from public.media_on_this_day('Asia/Jakarta', 12)");
assert.deepEqual(memories.map((r) => r.title), ["Kemah Bakti"]);

// Agenda & album: anon hanya melihat yang terbit, tanpa kolom internal.
await db.exec(`
  insert into public.events (title, starts_at) values ('Study Tour', now() + interval '3 days');
  insert into public.events (title, starts_at, is_published) values ('Rahasia', now() + interval '1 day', false);
  insert into public.albums (slug, title, event_id)
    select 'study-tour', 'Study Tour', id from public.events where title = 'Study Tour';
  update public.media set album_id = (select id from public.albums where slug = 'study-tour');`);
const events = await asRole("anon", "select title from public.events order by starts_at");
assert.deepEqual(events.map((r) => r.title), ["Study Tour"]);
await rejects("anon", "select created_by from public.events", /permission denied/);
await rejects("anon", "select ip_address from public.media", /permission denied/);
const albums = await asRole("anon", "select slug, media_count from public.album_summaries()");
assert.deepEqual(albums.map((r) => [r.slug, Number(r.media_count)]), [["study-tour", 2]]);
await assert.rejects(
  rows("insert into public.events (title, starts_at, ends_at) values ('x', now(), now() - interval '1 hour')"),
  /events_time_order/,
);

// Carousel: slide ikut visibilitas pin induk; satu objek hanya satu slot lintas tabel.
const constants = await readFile("src/lib/constants.ts", "utf8");
const mediaPerPost = Number(constants.match(/mediaPerPost:\s*(\d+)/)?.[1]);
assert.ok(mediaPerPost > 1, "UPLOAD_LIMITS.mediaPerPost tidak ditemukan");
const slidePositionMax = Number(
  schema.match(/position smallint not null check \(position between 1 and (\d+)\)/)?.[1],
);
assert.equal(slidePositionMax, mediaPerPost - 1, "posisi media_slides harus sampai mediaPerPost - 1");
const slideInsert = (position, type, url, mime = null, parent = "https://x/media/a.jpg") =>
  `insert into public.media_slides (media_id, position, type, url, mime_type)
   select id, ${position}, '${type}', '${url}', ${mime ? `'${mime}'` : "null"}
   from public.media where url = '${parent}'`;
await db.exec(`
  ${slideInsert(1, "video", "https://x/media/a-2.mp4", "video/mp4")};
  ${slideInsert(1, "photo", "https://x/media/c-2.jpg", null, "https://x/media/c.jpg")};`);
const slides = await asRole("anon", "select url, position from public.media_slides order by url");
assert.deepEqual(slides, [{ url: "https://x/media/a-2.mp4", position: 1 }], "slide pin pending tidak boleh terbaca anon");
await rejects("anon", slideInsert(2, "photo", "https://x/media/anon.jpg"), /row-level security|permission denied/);
await assert.rejects(rows(slideInsert(2, "photo", "https://x/media/b.jpg")), /already referenced/);
await assert.rejects(
  rows("insert into public.media (type, url) values ('video', 'https://x/media/a-2.mp4')"),
  /already referenced/,
);
await assert.rejects(
  rows("update public.media set url = 'https://x/media/c-2.jpg' where url = 'https://x/media/b.jpg'"),
  /already referenced/,
);
await assert.rejects(rows(slideInsert(1, "photo", "https://x/media/a-dup.jpg")), /media_slides_position_unique/);
await assert.rejects(rows(slideInsert(mediaPerPost, "photo", "https://x/media/a-10.jpg")), /check constraint/);
await assert.rejects(
  rows(slideInsert(2, "photo", "https://x/media/a-3.jpg", "video/mp4")),
  /media_slides_mime_type_matches_type/,
);
await assert.rejects(
  rows("insert into public.media (type, url, mime_type) values ('photo', 'https://x/media/m.jpg', 'video/mp4')"),
  /media_mime_type_matches_type/,
);
await db.exec("delete from public.media where url = 'https://x/media/c.jpg'");
const [{ orphanSlides }] = await rows(
  "select count(*)::int as \"orphanSlides\" from public.media_slides where url = 'https://x/media/c-2.jpg'",
);
assert.equal(orphanSlides, 0, "hapus pin menghapus slide-nya");

// Referensi gambar artikel (untuk pembersihan storage).
const inUse = await asRole(
  "service_role",
  "select * from public.blog_asset_paths_in_use(array['in-abc.webp', 'in-zzz.webp'])",
);
assert.deepEqual(inUse.map((r) => Object.values(r)[0]), ["in-abc.webp"]);
await rejects("anon", "select * from public.blog_asset_paths_in_use(array['x'])", /permission denied/);

// Retensi data: IP/perangkat kedaluwarsa dihapus/dianonimkan.
await db.exec(`
  insert into public.visitors (visitor_id, ip_address, user_agent, notifications_enabled, last_seen_at) values
    ('old-off', '1.1.1.1', 'UA', false, now() - interval '200 days'),
    ('old-on', '2.2.2.2', 'UA', true, now() - interval '200 days'),
    ('new', '3.3.3.3', 'UA', false, now());
  select public.apply_data_retention(180);`);
const visitors = await rows("select visitor_id, ip_address from public.visitors order by visitor_id");
assert.deepEqual(visitors, [
  { visitor_id: "new", ip_address: "3.3.3.3" },
  { visitor_id: "old-on", ip_address: null },
]);
await rejects("anon", "select public.apply_data_retention(180)", /permission denied/);

// Retensi push: info perangkat lama dianonimkan; langganan lama tanpa pengunjung dihapus.
await db.exec(`
  insert into public.push_subscriptions (visitor_id, endpoint, p256dh, auth, user_agent, created_at) values
    ('old-on', 'https://push.example/a', 'k', 'a', 'UA', now() - interval '200 days'),
    ('gone', 'https://push.example/b', 'k', 'a', 'UA', now() - interval '200 days'),
    ('new', 'https://push.example/c', 'k', 'a', 'UA', now());
  select public.apply_data_retention(180);`);
const subscriptions = await rows(
  "select endpoint, user_agent from public.push_subscriptions order by endpoint",
);
assert.deepEqual(subscriptions, [
  { endpoint: "https://push.example/a", user_agent: null },
  { endpoint: "https://push.example/c", user_agent: "UA" },
]);
await assert.rejects(rows("select public.apply_data_retention(1)"), /invalid retention days/);

// Hapus album tidak menghapus media.
await db.exec("delete from public.albums where slug = 'study-tour'");
const [{ total, unlinked }] = await rows(
  "select count(*)::int as total, count(*) filter (where album_id is null)::int as unlinked from public.media",
);
assert.equal(total, unlinked);

// Upgrade label hero: chip yang dulu ditebak dari identitas disalin SEKALI ke
// hero_badge saat kolomnya dibuat; setelah itu pilihan admin tidak ditimpa.
const heroBadge = async () =>
  (await rows("select hero_badge from public.site_settings where id = 1"))[0].hero_badge;
const upgradeFromLegacy = async (values) => {
  await db.exec("alter table public.site_settings drop column hero_badge");
  await db.query(
    `update public.site_settings
     set site_name = $1, site_alternate_name = $2, hero_title = $3
     where id = 1`,
    values,
  );
  await db.exec(schema);
};
await upgradeFromLegacy(["Ruang Bersama", "RB", "Selamat datang"]);
assert.equal(await heroBadge(), "RB", "nama alternatif yang dulu tampil ikut disalin");
await db.exec("update public.site_settings set hero_badge = null where id = 1");
await db.exec(schema);
assert.equal(await heroBadge(), null, "label yang dikosongkan admin tidak diisi ulang");
await upgradeFromLegacy(["Ruang Bersama", "RB", "RB"]);
assert.equal(await heroBadge(), "Ruang Bersama", "judul = nama alternatif → chip nama website");
await upgradeFromLegacy(["Ruang Bersama", null, null]);
assert.equal(await heroBadge(), null, "judul kosong tanpa nama alternatif → tanpa chip");

await db.close();
console.log("schema.sql idempoten dan lolos uji fungsi/RLS.");
