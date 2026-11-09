# Changelog

Semua perubahan penting pada proyek ini dicatat di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/),
dan proyek ini menganut [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

### Ditambahkan

- Dokumentasi arsitektur teknis lengkap di [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).
- Berkas komunitas open source di `.github/` (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
  `SECURITY.md`, `PULL_REQUEST_TEMPLATE.md`, `ISSUE_TEMPLATE/`, `dependabot.yml`,
  dan `CODEOWNERS`) serta `CHANGELOG.md`.
- Konstanta `MEMBER_OG_CARD_PATH` di `src/lib/seo/index.ts` agar kartu OG profil
  anggota otomatis mewarisi dimensi metadata `1200×630`.
- Metadata `repository`, `homepage`, `bugs`, dan `keywords` di `package.json`.

### Diubah

- `README.md` ditulis ulang dari awal agar ringkas, terstruktur, dan mudah dipindai;
  detail implementasi internal dipindahkan ke `docs/ARCHITECTURE.md`.
- Struktur `src/lib/` dirapikan sesuai kategori folder:
  - `src/lib/share-target.ts` → `src/lib/pwa/share-target.ts`
  - `src/lib/storage.ts` → `src/lib/supabase/storage.ts`
  - `src/lib/moderation.ts` → `src/lib/security/moderation.ts`
  - `src/lib/maintenance.ts` → `src/lib/security/maintenance.ts`
  - `src/lib/saved-items.ts` → `src/lib/hooks/use-saved-items.ts`
  - `src/lib/visitors.ts` → `src/lib/visitors/index.ts`
- Perhitungan luminansi dan rasio kontras WCAG 2.1 disatukan di `src/lib/utils/color.ts`
  dan dipakai bersama oleh `src/lib/theme.ts`.
- Workflow CI dipindah dari `docs/ci-workflow.yml` ke
  `.github/workflows/ci.yml` agar berjalan otomatis di setiap push dan pull
  request.

### Keamanan

- Pembaruan dependensi produksi (`next` & `eslint-config-next` ke `^16.4.5`,
  `zod` ke `^4.6.7`, serta `sanitize-html` ke `^2.18.1`) untuk menutup
  advisory keamanan terbaru pada `npm run audit:prod`.

## [1.1.0] - 2026-11-09

### Ditambahkan

- Filter Galeri berdasarkan jenis (foto/video) dan kategori, serta filter Blog
  berdasarkan kategori dan `#tag`, lengkap dengan chip yang bisa dihapus.
- Chip kategori dan tag di detail pin dan artikel kini menjadi tautan ke
  daftar yang terfilter.
- Pencarian Spotlight kini juga mencakup **album** dan **agenda** (hanya acara
  yang sudah terbit).
- Tautan dua arah anggota ↔ konten: profil anggota menampilkan media dan
  artikel yang menyebut namanya, dan sebaliknya.
- Komponen bersama `FilterChips` dan `MentionedMembers`, serta helper URL
  `normalizeQueryFilter`/`buildQueryHref`.

### Diubah

- Pagination memakai helper `buildQueryHref` yang sama dengan filter.
- Artikel unggulan disembunyikan saat filter Blog aktif.

### Dihapus

- Dependensi `framer-motion` (seluruh animasi kini CSS murni).
- Kolom usang `visitors.location`, `blog_posts.views`, `media.thumbnail_url`,
  `media_slides.thumbnail_url`, dan `cover_thumbnail_url`. Penghapusan di
  `schema.sql` bersifat idempoten (`drop column if exists`).

### Migrasi

- Jalankan ulang seluruh `supabase/schema.sql` di SQL Editor (simpan backup
  lebih dulu) untuk memperbarui fungsi `search_site` dan menghapus kolom usang.

## [1.0.0] - 2026-11-08

Rilis publik pertama.

### Ditambahkan

- Panel admin untuk mengatur identitas, istilah anggota, warna, logo, hero,
  kontak, dan SEO tanpa mengubah kode.
- Galeri foto/video dengan pin carousel hingga 10 item, unggahan publik
  ber-moderasi, dan komentar.
- Blog dengan editor rich text, cover, kategori, tag, dan status publikasi.
- Album, Agenda dengan hitung mundur live, Koleksi Tersimpan, dan
  "Kenangan hari ini".
- Pencarian Spotlight full-text bahasa Indonesia.
- Dynamic Island untuk navigasi, status proses, notifikasi, dan kontrol musik.
- Playlist audio persisten dengan Media Session.
- PWA dengan share target dan Web Push.
- Sistem motion & kedalaman 3D berbasis CSS dengan dukungan
  `prefers-reduced-motion`.
- Supabase Postgres + Storage dengan RLS, signed upload, dan bucket inbox
  privat untuk kiriman yang belum dimoderasi.

[Unreleased]: https://github.com/diasera/openweb/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/diasera/openweb/compare/661ecf5...v1.1.0
[1.0.0]: https://github.com/diasera/openweb/commit/661ecf5
