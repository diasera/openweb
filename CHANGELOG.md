# Changelog

Semua perubahan penting pada proyek ini dicatat di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id-ID/1.1.0/),
dan proyek ini menganut [Semantic Versioning](https://semver.org/lang/id/).

## [Unreleased]

## [1.3.0] - 2026-11-20

### Ditambahkan

- **Generator QR Matrix Offline** murni TypeScript bebas dependensi di `src/lib/qr/index.ts`
  dan komponen vektor `QrCodeSvg` di `src/components/ui/qr-code.tsx` (ISO/IEC 18004,
  Byte-mode, koreksi galat level M, versi 1–10) sehingga bekerja 100% offline pada PWA.
- **Kartu Anggota Digital Holografik 3D (`MemberPassModal`)** di
  `src/components/public/profil/member-pass-modal.tsx`: kartu ID dua sisi (flip 3D) dengan
  kilau foil holografik berbasis `--depth-px/--depth-py`, kode QR profil offline di sisi
  belakang, salin tautan cepat, dan ekspor **Kartu Story `9:16`** lengkap dengan foto profil
  nyata & lencana QR.
- **Siaran Pengumuman *Live Activity* di Dynamic Island**
  (`src/components/public/dynamic-island/views/announcement-activity.tsx`): notifikasi terbaru
  (≤ 72 jam) yang belum dibaca tampil otomatis sebagai chip *Live Activity* dan kartu panel
  cepat dengan tombol *"Tandai dibaca"* yang sinkron lintas tab dengan `/notifikasi`
  (`STORAGE_KEYS.notificationLastSeen`).
- **Halaman Kilas Balik Komunitas (`/kilas-balik`)** (`src/lib/wrapped/index.ts`,
  `src/components/public/wrapped-showcase.tsx`, `src/app/kilas-balik/page.tsx`): rangkuman
  perjalanan komunitas tanpa tabel baru dengan filter periode tahun, ubin statistik
  beranimasi, grafik ritme 12 bulan murni CSS, topik teraktif, album terpadat, anggota paling
  sering terekam, pesan terpopuler, tombol putar **Songfess terfavorit** langsung ke Dynamic
  Island, dan ekspor **Kartu Story `9:16` (`kind: "wrapped"`)**.
- **Reaksi Emoji Cepat untuk Pin Galeri & Artikel Blog (`public.content_reactions`)**:
  - Skema tabel idempoten + RLS tertutup (`visitor_id` tidak pernah terbuka ke `anon`) +
    dua RPC atomik `SECURITY DEFINER` (`get_reaction_counts` & `toggle_content_reaction`) di
    `supabase/schema.sql`, lengkap dengan uji otomatis PGlite di `scripts/check-schema.mjs`.
  - Endpoint terproteksi `POST /api/reactions` (`guardPublicMutation`, `RATE_LIMITS.reaction`,
    cookie pengunjung HMAC) serta komponen terpusat `ReactionBar` di `/pin/[id]` dan
    `/blog/[slug]` dengan degradasi anggun pra-migrasi dan mode demo interaktif.
- Primitif bersama **`CopyButton`** (`src/components/ui/copy-button.tsx`) dan toolbar grid
  media **`MediaGridControls`** (`src/components/public/media-grid-controls.tsx`) yang dipakai
  ulang lintas Galeri, Detail Album, Tersimpan, Tentang, Profil Anggota, dan Pengaturan Admin.
- Varian baru **`kind: "pin"`** dan **`kind: "wrapped"`** beserta foto profil & QR Code pada
  mesin **Kartu Story `9:16`** (`src/lib/story-card/index.ts`).

### Diubah

- **Profil Anggota Interaktif (`/profil/[slug]`)**: `MemberActivityExplorer` menyambungkan
  klik sel pada `MemberHeatmap` (lengkap dengan label bulan/hari, hari aktif, dan rentetan
  beruntun) langsung ke `MemberTimeline` dengan filter `Semua / Media / Artikel`, pengelompokan
  bulanan, mode tampilan `Grid`, zoom foto profil via `MediaLightbox`, dan `CopyButton` pada
  nomor identitas.
- **Detail Pin & Komentar (`/pin/[id]`)**: aktivasi nama tampilan opsional pada komentar
  (`author_name` tersimpan lokal), tombol balas `@Nama`, urutan `Terbaru / Terlama`,
  penghitung karakter mendekati batas 500, respons `{ ok: true, comment }` dari `/api/comments`,
  tombol **Kartu Story `9:16`**, navigasi Sebelumnya/Berikutnya dalam album, tautan media asli,
  dan `ReactionBar`.
- **Album & Koleksi Tersimpan (`/album`, `/album/[slug]`, `/tersimpan`)**: pencarian & sortir
  album (`AlbumBrowser`), tombol **Slideshow** (`MediaLightbox`) + `MediaGridControls` +
  `ShareButton` + `EventStatusBadge` pada detail album, serta **Tersimpan Pro** (cari, tab
  Pin/Artikel, sortir tanggal simpan, tombol coba lagi, slideshow pin, ekspor cadangan JSON,
  dan kosongkan dengan konfirmasi `Modal`).
- **Beranda, Tentang, Notifikasi & Pesan Anonim**:
  - Beranda (`/`) kini menampilkan seksi **Artikel terbaru**, tautan album pada kartu Agenda
    unggulan, serta kartu pintu cepat **Kilas Balik**.
  - Halaman Tentang (`/tentang`) menghadirkan strip statistik komunitas, kontak klik-aktif
    (`mailto:`, `tel:`, tautan Google Maps), `CopyButton`, `ShareButton`, dan handle sosial
    ringkas.
  - Halaman Notifikasi (`/notifikasi`) beralih ke `<MotionLink>` untuk tautan internal (tanpa
    memutus transisi halaman & musik), pengelompokan waktu (`Hari ini / Minggu ini / Sebelumnya`),
    filter `Semua / Baru`, kartu status Web Push perangkat, dan dukungan `DEMO_NOTIFICATIONS`.
  - `NotifPrompt` otomatis sembunyi di Mode Demo maupun saat izin browser sudah diputuskan,
    serta menunda pengingat 7 hari saat ditutup.
  - `MessageLike` menyelaraskan jumlah suka terhadap pembaruan prop terbaru dengan mikro-animasi
    burst hati.
- **Panel Admin (`/profil`, `/profil/pengunjung`, `/profil/setting`)**:
  - Dasbor Admin mendukung triase cepat pesan terbaru langsung di tempat (*Tandai dibaca*,
    *Pin/Lepas pin*, *Baca semua*) serta kartu status kanal **Web Push VAPID**.
  - Halaman Pengunjung menghadirkan **Quick Link Picker** dari artikel/agenda/album terbaru,
    pratinjau notifikasi responsif di ponsel, dialog konfirmasi `ConfirmSheet` sebelum siaran
    massal Web Push, tombol *"Gunakan ulang"* riwayat notifikasi, serta tab filter `AdminTabs`
    (`Semua / Lonceng aktif / Diblokir`).
  - Tab Pengaturan Beranda dilengkapi sakelar pratinjau Hero **Desktop / Ponsel** serta
    *builder* daftar Misi interaktif; `SeoHealth` dan `ContactSection` memakai ulang `CopyButton`.

## [1.2.0] - 2026-11-20

### Ditambahkan

- Mesin warna perseptual **OKLCH** + evaluasi kontras ganda **WCAG 2.2 AA & APCA (`Lc`)**
  di `src/lib/utils/color.ts` dan `src/lib/theme.ts`, lengkap dengan token wide-gamut
  Display P3 (`--primary-oklch`, `--accent-oklch`).
- **5 preset atmosfer tema** siap pilih dari **Admin → Pengaturan → Identitas**
  (`Liquid Spatial`, `Editorial Paper`, `Midnight Botanical` OLED, `Studio Neo-Bento`,
  dan `Tactile Zine`) dengan kartu pratinjau dual-mode (terang & gelap berdampingan).
- Utilitas CSS `@utility concentric` (sudut konsentris iOS 26 HIG) di `src/app/globals.css`,
  serta kerangka hitung mundur awal (`--`) pada `EventCountdown` sebelum hidrasi klien.
- Parser `User-Agent` + `Sec-CH-UA` Client Hints internal bebas dependensi di
  `src/lib/utils/user-agent.ts`.
- Pusat morph elemen bersama `SharedMorph` berbasis React 19.3 `<ViewTransition>`
  di `src/components/motion/shared-morph.tsx` untuk transisi mulus pada kartu Pin
  (`pin-*`), avatar Anggota (`member-*`), dan sampul Blog (`post-cover-*`), dengan
  penjangkaran persisten pada Dynamic Island (`chrome-island`) dan Tab Bar (`chrome-tabbar`).
- Komponen **Theater `MediaLightbox`** layar penuh di `src/components/ui/media-lightbox.tsx`
  dengan pendaran warna ambient dinamis, pinch-to-zoom, ketuk dua kali `2.4×`, zoom
  roda mouse/trackpad, geser terbatas saat diperbesar, dan usap ke bawah untuk menutup.
- Pengayaan artikel blog di `src/components/public/article-content.tsx` (`ArticleCover`
  & `ArticleContent`): klik foto sampul maupun ilustrasi di dalam isi artikel membuka
  Theater Lightbox, serta tombol satu klik **"Salin"** pada setiap blok kode `<pre>`.
- Hook aksesibilitas dialog terpusat `useDialogFocusTrap` di
  `src/lib/hooks/use-dialog-focus-trap.ts` (dipakai bersama oleh `Modal` dan
  `MediaLightbox`), serta gestur fisika *rubber-band drag-to-dismiss* dan grabber
  sentuh pada `src/components/ui/modal.tsx`.
- Navigasi keyboard penuh (`ArrowUp`/`ArrowDown`/`Enter`), lencana pintasan `⌘K`,
  dan filter kategori instan pada Spotlight Dynamic Island (`expanded-route-view.tsx`),
  serta daftar antrean lagu (*queue drawer*) elastis dan sampul PWA pada `MediaSession`
  pemutar musik (`music-island-view.tsx`, `music-provider.tsx`).
- Pengalaman baca editorial Blog: bilah progres baca 120fps bebas JS (`ReadingProgressBar`),
  **Daftar Isi otomatis (`ArticleToc`)** dengan pelacak subjudul aktif (`src/lib/blog/toc.ts`),
  serta ekstensi blok sorotan editorial **`Callout`** (`Catatan`, `Tips`, `Penting`,
  `Perhatian`) pada editor TipTap v3 (`rich-editor.tsx` & `src/lib/blog/callout-extension.ts`).
- Peningkatan kartu **Agenda** bergaya Luma (`event-card.tsx`): lencana status waktu nyata
  (`EventStatusBadge`), tautan lokasi interaktif ke Google Maps, ekspor **Outlook Web**
  (`calendar.ts`), dan tombol bagikan tautan spesifik acara.
- Peningkatan **Galeri Pro** (`galeri-browser.tsx` & `masonry.tsx`): filter bentuk visual
  (`Potret`, `Lanskap`, `Multi-Slide`) dan sakelar kepadatan tampilan (**Nyaman** vs **Padat**).
- Generator **Kartu Story `9:16` (`1080×1920` PNG)** terpusat di `src/lib/story-card/index.ts`
  dan `src/components/public/story-share-button.tsx` (mendukung *Web Share API* langsung ke
  Instagram/WhatsApp Story di ponsel dan unduhan PNG di desktop), terhubung ke Pesan Anonim,
  Buku Angkatan, dan Profil Anggota.
- Fitur **Songfess pada Pesan Anonim** (`src/lib/messages/songfess.ts`, `message-composer.tsx`,
  `message-card.tsx`, `/api/pesan`, dan panel moderasi admin): pengirim dapat menyematkan lagu
  aktif dari playlist situs yang dapat diputar langsung ke **Dynamic Island** saat pesan dibaca.
- **Mode Buku Angkatan (*Yearbook View*)** pada halaman Anggota (`member-browser.tsx`):
  sakelar tampilan antara grid **Direktori** dan kartu editorial **Buku Angkatan** lengkap
  dengan kutipan bio anggota dan tombol pembuatan Kartu Story `9:16`.

### Diubah

- Migrasi konfigurasi `next.config.mjs` ke `next.config.ts` bertipe penuh dengan
  pengaktifan **React Compiler** (`reactCompiler: true` + native Rust compiler
  `turbopackRustReactCompiler: true`) dan **Typed Routes** (`typedRoutes: true`).
- Pembaruan seluruh dependensi ke rilis stabil terbaru (`next` `16.4.6`, `react`
  `19.3.1`, `@tiptap/*` `3.34.0`, `tailwindcss` `4.3.5`, `lucide-react` `1.74.0`,
  `@supabase/supabase-js` `2.119.0`, `jose` `6.2.17`, `heic-to` `1.6.7`,
  `sanitize-html` `2.18.2`, dan `@electric-sql/pglite` `0.5.16`).
- `SectionHeader` memisahkan judul dan lencana jumlah item secara semantik untuk
  pembaca layar dan mesin pencari.

### Dihapus

- Dependensi `ua-parser-js` (`AGPL-3.0-or-later`) agar pohon dependensi tetap
  selaras penuh dengan lisensi MIT proyek.

## [1.1.1] - 2026-11-17

### Ditambahkan

- Dokumentasi arsitektur teknis lengkap di [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).
- Berkas komunitas open source di `.github/` (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
  `SECURITY.md`, `PULL_REQUEST_TEMPLATE.md`, `ISSUE_TEMPLATE/`, `dependabot.yml`,
  dan `CODEOWNERS`) serta `CHANGELOG.md`.
- Konstanta `MEMBER_OG_CARD_PATH` di `src/lib/seo/index.ts` agar kartu OG profil
  anggota otomatis mewarisi dimensi metadata `1200×630`.
- Metadata `repository`, `homepage`, `bugs`, dan `keywords` di `package.json`.
- Token cookie pengunjung bertanda tangan HMAC (`signVisitorToken` / `verifyVisitorToken`),
  validator terpusat dokumen ProseMirror (`src/lib/blog/doc.ts`), serta 5 indeks
  GIN full-text search dan constraint validasi URL/endpoint pada `supabase/schema.sql`.

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
- `PublicPostCard` menghitung `reading_minutes` di server tanpa menyertakan HTML
  penuh pada endpoint `/api/tersimpan` dan daftar artikel; rute `/api/og/*`
  mengembalikan `404` untuk slug yang tidak ditemukan.

### Keamanan

- Pembaruan dependensi produksi (`next` & `eslint-config-next` ke `^16.4.5`,
  `zod` ke `^4.6.7`, serta `sanitize-html` ke `^2.18.1`) untuk menutup
  advisory keamanan terbaru pada `npm run audit:prod`.
- Validasi domain layanan Web Push resmi, kunci publik P-256 (`p256dh`/`auth`),
  timeout pengiriman, dan penegakan `banned_ips` pada pendaftaran notifikasi.
- Penguncian `images.remotePatterns` hanya ke host project Supabase aktif tanpa
  redirect, penambahan header HSTS/COOP/CSP dasar, pembacaan hop tepercaya
  `X-Forwarded-For`, serta penolakan mutasi lintas-subdomain `Sec-Fetch-Site`.
- Isolasi kuota percobaan login perangkat tepercaya (`DEVICE_COOKIE`), pencabutan
  `session_version` di server saat logout, pembatasan atribut `class` pada `<code>`
  artikel, isolasi acara draf lintas izin admin, batas kuota PWA Share Target,
  dan pencabutan hak default tabel PostgreSQL (`REVOKE ALL`) di `schema.sql`.

### Migrasi

- Jalankan ulang `supabase/schema.sql` di SQL Editor (idempoten) untuk menerapkan
  pencabutan hak akses default tabel, constraint URL/Web Push, reservasi slug
  `'ringkasan'`, dan indeks pencarian GIN.

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

[Unreleased]: https://github.com/diasera/openweb/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/diasera/openweb/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/diasera/openweb/compare/661ecf5...v1.1.0
[1.0.0]: https://github.com/diasera/openweb/commit/661ecf5
