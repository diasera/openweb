# Ruang Bersama

Template website komunitas yang dapat dikustomisasi dari panel admin tanpa
mengubah source code. Cocok untuk kelas kuliah, sekolah, organisasi, komunitas,
usaha kecil, maupun portofolio kelompok.

Antarmukanya terinspirasi pola interaksi iOS dan susunan media Pinterest,
dengan satu Dynamic Island untuk navigasi, status proses, notifikasi, dan
kontrol musik. Proyek ini bukan produk resmi dan tidak berafiliasi dengan
Apple atau Pinterest.

## Fitur utama

- Identitas, jenis website, istilah anggota, bahasa, kontak, tautan sosial,
  warna, logo, favicon, dan hero dapat diatur dari Profil Admin.
- Galeri foto/video, pin pilihan di homepage, komentar, dan unggahan publik
  dengan moderasi admin (termasuk moderasi komentar lintas pin).
- Pin carousel ala Instagram: satu pin berisi hingga 10 foto/video. Buat Pin
  memakai composer multi-pilih dengan pratinjau carousel, filmstrip yang bisa
  diurutkan (tahan & geser, tombol, atau Alt+panah), edit per foto, dan
  unggahan paralel dengan progres per item. Kartu menampilkan badge jumlah
  item; detail pin bisa digeser (scroll-snap native), punya page control,
  navigasi keyboard, dan ketuk dua kali untuk Simpan. Moderator meninjau
  setiap slide sebelum menyetujui.
- Album per acara (`/album`) yang dikelola dari Profil Admin → Media → Album.
- Agenda (`/agenda`) dengan hitung mundur live: acara terdekat tampil sebagai
  Live Activity di Dynamic Island (H-7 sampai selesai) dan bisa disimpan ke
  Kalender Apple/Outlook (`.ics`) atau Google Calendar.
- Koleksi Tersimpan (`/tersimpan`) untuk pin dan artikel, tersimpan di
  perangkat tanpa akun dan tersinkron antar-tab.
- "Kenangan hari ini" di homepage: media pada tanggal yang sama tahun lalu.
- Pencarian Spotlight full-text bahasa Indonesia (stemming + awalan kata),
  termasuk isi artikel, caption, dan NIM anggota.
- PWA share target: foto/video dari menu Bagikan galeri Android langsung
  terbuka di Buat Pin; beberapa file sekaligus langsung menjadi carousel.
- Blog dengan editor rich text, cover, kategori, tag, draft, dan publikasi.
- Profil anggota dengan URL ramah baca seperti `/profil/siti-sholeh` serta
  riwayat media dan artikel yang menyebut nama anggota.
- Pesan anonim; hanya pesan yang dipin admin ditampilkan di homepage.
- Playlist audio persisten dengan putar, jeda, seek, next/previous, Media
  Session, dan kontrol Dynamic Island.
- Tema terang/gelap, motion lintas halaman dengan kurva pegas iOS asli
  (`linear()` spring), tab bar responsif, serta dukungan
  `prefers-reduced-motion`.
- Sistem kedalaman "Depth" tanpa library 3D: kartu interaktif miring
  mengikuti kursor dengan pantulan cahaya, tekan-dalam di layar sentuh, daftar
  bangkit dalam 3D saat digulir (scroll-driven animation di compositor), hero
  berlapis dengan parallax dan efek mundur saat scroll, serta transisi halaman
  3D. Seluruh gerak hanya `transform`/`opacity` dan mati otomatis untuk
  reduced motion.
- Owner dan admin dengan izin per fitur, statistik, moderasi IP, notifikasi,
  dan pengelolaan konten dari tab Profil yang sama.
- SEO terpusat: site name, canonical URL, judul/deskripsi homepage, gambar
  sosial, sitemap, robots, structured data, Search Console, Bing, Analytics,
  dan konfigurasi AdSense.
- Supabase Postgres + Storage dengan RLS dan signed upload; file besar tidak
  melewati Server Action.
- Unggahan publik mendarat di bucket privat `media-inbox` dan baru dipindah ke
  bucket publik saat disetujui, sehingga kiriman yang belum dimoderasi tidak
  pernah punya URL publik. Unggahan yang ditinggal dibersihkan otomatis.
- Registry format media terpusat, pemeriksaan signature byte, normalisasi
  HEIC/HEIF iPhone yang lazy-loaded, serta alias format lintas iOS/Android.

## Prinsip arsitektur

- `src/lib/site-config/` adalah pusat validasi, default, pilihan, dan runtime
  konfigurasi website.
- `src/app/globals.css` adalah pusat token desain: skala teks iOS Dynamic Type
  (`text-caption2` … `text-large-title`), warna sistem iOS (`tone-*`, varian
  `-text` lolos kontras AA), satu material kaca (`glass-material`) dengan tepi
  spekular Liquid Glass (`--glass-rim`), elevasi kartu terang/gelap
  (`--elevation-*`), tekstur `grain` untuk mesh gradient, dan masonry.
  `src/lib/theme.ts` menurunkan warna turunan dari warna utama yang diatur
  admin.
- `src/app/fonts/` memuat satu font display self-hosted (Plus Jakarta Sans
  variabel, OFL) lewat `next/font/local` untuk semua judul; teks isi tetap
  memakai font sistem. Build tidak membutuhkan akses Google Fonts.
- `src/components/public/dynamic-island/` adalah satu-satunya pemilik visual
  Dynamic Island; feedback fitur masuk melalui kanal yang sama.
- `src/lib/data/` memusatkan pembacaan data publik dan fallback demo.
- `src/lib/database/` memusatkan kontrak mutasi dan pesan error database.
- `src/lib/media-formats/` memusatkan format ingest, MIME storage, signature,
  normalisasi, dan probe playback untuk seluruh picker serta API.
- `src/lib/media/slides.ts` + `src/components/ui/media-carousel.tsx` adalah satu
  bentuk slide dan satu renderer carousel untuk detail pin, moderasi admin, dan
  composer. Baris `media` tetap menjadi pin sekaligus sampul; slide berikutnya
  ada di tabel `media_slides`, sehingga kartu, pencarian, album, dan feed lama
  tidak berubah.
- `src/components/motion/motion.css` memusatkan token durasi, kurva spring
  (`--motion-spring`, `--motion-spring-snappy`, `--motion-spring-bouncy`), dan
  kedalaman 3D: `.motion-card`/`[data-depth-tilt]` (tilt + glare, diisi satu
  listener `useDepthPointer`), `.motion-reveal` (reveal 3D berbasis scroll),
  `.motion-parallax`, `.animate-rise`, dan transisi rute. Daftar memakai
  `listReveal(index)` pada pembungkus item, bukan pada kartu yang ikut tilt.
- `src/components/ui/icon-plate.tsx` adalah satu bentuk plat ikon ala
  Pengaturan iOS untuk menu Profil, banner notifikasi, dan kartu admin.
- `src/components/public/destination-icons.ts` adalah satu peta ikon per
  tujuan navigasi untuk tab bar, panel cepat island, menu Profil, hasil
  Spotlight, dan navigasi admin.
- `src/lib/utils/time.ts` memusatkan format tanggal/jam di zona waktu situs.
  Halaman publik ber-cache memakai `src/components/ui/relative-time.tsx`:
  tanggal absolut saat SSR/hydration, lalu label relatif ("5 menit lalu")
  sesudah hydration, sehingga tidak ada hydration mismatch. Jam yang terus
  berdetak memakai `useNow` di `src/lib/hooks/use-now.ts`.
- `src/lib/utils/storage.ts` adalah satu daftar key `localStorage` beserta
  pembaca/penulis yang aman (mode privat, kuota penuh, JSON rusak).
- `src/lib/media/revalidate.ts` adalah satu daftar halaman yang menampilkan
  media; moderasi, unggah, dan edit foto memakainya agar tidak ada halaman
  ber-ISR yang tertinggal basi.
- `src/lib/seo/feed.ts` adalah satu sumber isi `/feed.xml` dan `/feed.json`.
- `src/components/admin/use-admin-action.ts` memusatkan pending, konfirmasi,
  dan toast untuk aksi admin; `useFormDirty` (`src/lib/hooks/use-form-dirty.ts`)
  menyediakan `notifyFormChange` untuk kontrol yang berubah tanpa event native
  (Switch, editor foto).
- `src/lib/types/database.ts` adalah kontrak TypeScript untuk skema Supabase.
- `supabase/schema.sql` adalah sumber kebenaran database instalasi baru.

## Persyaratan

- Node.js 24 LTS direkomendasikan (`.nvmrc` sudah disediakan); Node.js 22.12+
  tetap didukung oleh rentang `engines`.
- npm 11 direkomendasikan. Versi package manager dicatat di `package.json`
  agar instalasi publik dapat direproduksi.
- Project Supabase untuk mode produksi

Tanpa environment Supabase, aplikasi tetap dapat dibuka memakai data demo
generik. Fitur yang menulis data memerlukan Supabase.

### Versi yang sengaja ditahan

Seluruh dependensi berada di rilis terbaru yang kompatibel, kecuali dua major:

- **TypeScript tetap 6.0.x.** TypeScript 7 (compiler native) belum menyertakan
  JS compiler API, padahal `typescript-eslint` mensyaratkan
  `typescript <6.1.0` dan skrip `check:*` memakai `ts.transpileModule`.
  Next.js 16.3 sendiri sudah mendukung TypeScript 7.
- **ESLint tetap 9.x.** `eslint-config-next` 16 bergantung pada
  `eslint-plugin-react`, `eslint-plugin-jsx-a11y`, dan `eslint-plugin-import`
  yang belum mendukung ESLint 10.

`npm audit` masih melaporkan satu advisory `braces` khusus dev (lewat
`@next/eslint-plugin-next` → `fast-glob`) yang belum memiliki rilis perbaikan;
dependensi produksi bersih (`npm run audit:prod`).

## Mulai cepat

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Di Windows PowerShell, perintah salin environment dapat ditulis sebagai:

```powershell
Copy-Item .env.local.example .env.local
```

Buka <http://localhost:3000>. Tab Profil akan mengarahkan instalasi baru ke
setup owner pertama.

## Environment

Isi `.env.local` dengan nilai dari dashboard Supabase:

| Variable | Kegunaan | Rahasia |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase | Tidak |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key yang dibatasi RLS | Tidak |
| `SUPABASE_SERVICE_ROLE_KEY` | Mutasi server dan signed upload | Ya |
| `AUTH_SECRET` | Menandatangani cookie sesi admin | Ya |
| `NEXT_PUBLIC_SITE_URL` | Fallback origin sebelum URL disimpan di pengaturan | Tidak |
| `TRUSTED_PROXY` | Sumber header IP self-hosted (`cloudflare`, `x-real-ip`, atau `x-forwarded-for`) | Tidak |
| `NEXT_PUBLIC_SITE_TIME_ZONE` | Zona waktu agenda dan "Kenangan hari ini" (IANA, bawaan `Asia/Jakarta`) | Tidak |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Kunci publik Web Push (opsional; tanpa ini lonceng hanya in-app) | Tidak |
| `VAPID_PRIVATE_KEY` | Kunci privat Web Push untuk mengirim notifikasi ke perangkat | Ya |
| `VAPID_SUBJECT` | Kontak pengirim push, mis. `mailto:admin@example.com` | Tidak |

`AUTH_SECRET` harus berupa string acak minimal 32 karakter. Jangan pernah
commit `.env`, `.env.local`, service role key, atau secret produksi.
Vercel terdeteksi otomatis. Pada self-hosted, biarkan `TRUSTED_PROXY` kosong
kecuali origin hanya menerima trafik proxy tepercaya dan proxy selalu menimpa
header IP dari klien; konfigurasi yang salah membuat IP mudah dipalsukan.

## Menyiapkan Supabase

1. Buat project Supabase.
2. Salin `supabase/schema.sql` ke SQL Editor lalu jalankan seluruh isinya.
3. Isi `.env.local`.
4. Jalankan `npm run dev` dan buat akun owner dari tab Profil.
5. Buka Profil Admin → Pengaturan untuk mengganti seluruh identitas demo.

### Memperbarui database yang sudah ada

`supabase/schema.sql` bersifat idempoten: untuk memperbarui instalasi lama,
jalankan ulang seluruh isinya di SQL Editor (simpan backup lebih dulu). Skrip
menambahkan kolom, fungsi, trigger, dan bucket baru tanpa menghapus data.
Bila aplikasi menampilkan pesan "Skema database belum diperbarui", langkah ini
yang dibutuhkan.

Sebelum `schema.sql` terbaru dijalankan, fitur yang tabelnya baru (Agenda,
Album, Kenangan hari ini, pencarian full-text, slide carousel) tampil kosong
alih-alih error, sehingga deploy tidak gagal. Pin satu media tetap bisa dibuat;
pin carousel (lebih dari satu item) menampilkan pesan "Skema database belum
diperbarui" sampai SQL-nya dijalankan.

Catatan pembaruan keamanan terbaru:

- Kiriman pending dari versi lama tetap berada di bucket publik sampai
  ditinjau; menyetujui atau menolaknya memindahkan objek ke lokasi yang benar.
- Mengganti password (atau menonaktifkan akun) langsung mengeluarkan sesi
  admin tersebut di semua perangkat.

## Format media

- Foto publik/storage: JPEG, PNG/APNG, GIF, WebP, dan AVIF.
- Sumber HEIC/HEIF iPhone dinormalisasi menjadi JPEG di Web Worker sebelum
  masuk editor atau Storage. BMP, TIFF, dan JPEG XL dinormalisasi bila browser
  perangkat dapat mendecodenya.
- Video: MP4/M4V, WebM, MOV/QuickTime, dan 3GP. MOV/HEVC tetap bergantung pada
  codec perangkat; untuk jangkauan penuh gunakan MP4 H.264 + AAC atau pasang
  adapter transcoding terpisah.
- Audio: MP3, M4A/AAC, Ogg/Opus/Vorbis, WebM Audio, FLAC, dan WAV.
- M4P rights-managed ditolak dengan pesan khusus karena FairPlay DRM tidak
  boleh dilewati oleh converter website. `.img` ditolak karena merupakan disk
  image, bukan format foto web.
- GIF/APNG serta WebP/AVIF animasi tidak dibuka sebagai foto statis agar frame
  lain tidak hilang tanpa persetujuan.

### Batas ukuran unggah

- Satu sumber: `UPLOAD_LIMITS` di `src/lib/constants.ts`, yaitu foto 100 MB
  serta video dan audio 500 MB per file.
- `file_size_limit` bucket di `supabase/schema.sql` bernilai sama dengan
  `UPLOAD_LIMITS`.
- `serverActions.bodySizeLimit` di `next.config.mjs` adalah batas foto ditambah
  10 MB. Server Action hanya membawa foto (pengaturan, anggota, cover artikel).
  Video dan audio dikirim langsung ke Storage lewat signed URL/TUS dan tidak
  pernah melewati server aplikasi.
- `src/proxy.ts` mengecualikan request Server Action (header `next-action`).
  Next memotong body yang melewati proxy di `proxyClientMaxBodySize`
  (bawaan 10 MB). Setiap action admin tetap memeriksa sesi sendiri lewat
  `requireFeature`/`requireAdmin`.
- `npm run check:media-formats` gagal bila nilai-nilai di atas tidak lagi
  selaras.

Batas platform tetap berlaku di atas angka aplikasi:

- **Supabase Free** membatasi setiap file maksimal 50 MB (batas global
  project). File yang lebih besar ditolak Storage meskipun limit bucket lebih
  tinggi. Naikkan *Global file size limit* di Storage Settings dashboard
  (paket Pro ke atas, hingga 500 GB), atau turunkan `UPLOAD_LIMITS`.
  Sumber: [Supabase Storage file limits](https://supabase.com/docs/guides/storage/uploads/file-limits).
- **Vercel Functions** menerima body request maksimal 4,5 MB. Foto yang
  dikirim lewat Server Action biasanya jauh lebih kecil karena editor
  mengekspornya ke WebP ≤2048 px. Namun GIF/WebP animasi besar akan ditolak
  dengan 413 pada deploy Vercel.

Klien unggah menampilkan pesan yang jelas bila Storage menolak file karena
ukurannya.

Jalankan `npm run check:media-formats` setelah mengubah registry, batas ukuran,
atau SQL. Daftar lisensi decoder pihak ketiga tersedia di
[`THIRD_PARTY_NOTICES.md`](./.github/THIRD_PARTY_NOTICES.md).

## Konfigurasi tanpa mengubah kode

Menu Pengaturan memusatkan konfigurasi berikut:

- nama website, nama alternatif (khusus mesin pencari), tipe website, dan locale;
- istilah tunggal/jamak anggota, nomor identitas, dan kelompok inti;
- deskripsi, tagline, logo, favicon, warna, visi, dan misi;
- hero beranda di tab Beranda: label, judul, subjudul, dan foto, dengan
  pratinjau langsung. Judul kosong memakai nama website; nama alternatif tidak
  pernah tampil di hero;
- email, telepon, alamat, footer, dan tautan sosial;
- canonical URL, kontrol indexing, dan gambar sosial;
- kode verifikasi Google/Bing, Google Analytics, dan Google AdSense.

Judul dan deskripsi hasil pencarian halaman depan disusun dari nama website,
tagline, dan deskripsi (lihat pratinjau Google di tab Identitas). Mesin pencari
menilai kualitas serta relevansi konten, aksesibilitas, performa, reputasi, dan
banyak sinyal lain; aplikasi tidak menjanjikan peringkat nomor satu atau
persetujuan AdSense.

## Endpoint SEO

Setelah `site_url` diisi dan aplikasi di-deploy, endpoint berikut dibuat
otomatis:

- `/sitemap.xml`
- `/robots.txt`
- `/manifest.webmanifest`
- `/ads.txt`

Kirim URL absolut `/sitemap.xml` ke Google Search Console. Perubahan nama situs,
judul, atau deskripsi baru terlihat setelah mesin pencari melakukan crawl ulang.

## Keamanan

- Anon key hanya membaca data publik yang diizinkan RLS.
- Tabel admin, visitor, pesan privat, dan daftar blokir tidak memiliki policy
  tulis untuk browser.
- Mutasi publik divalidasi di server dan dapat dibatasi berdasarkan IP.
- Rate limit disimpan atomik di Postgres sehingga tetap konsisten antar-instance
  serverless; aplikasi fail-closed bila migrasi keamanannya belum tersedia.
- Audio/video diunggah langsung ke signed URL satu-path yang berumur pendek.
- Signature awal file diverifikasi kembali dari byte Storage; MIME dan
  ekstensi tidak diperlakukan sebagai bukti isi file.
- Sesi admin memakai cookie `HttpOnly`, `Secure`, dan `SameSite=Lax`.
- Password disimpan sebagai hash scrypt, bukan plaintext.
- Minimisasi data: IP dan informasi perangkat pengunjung, komentar, pesan, dan
  media dihapus/dianonimkan otomatis setelah 180 hari (`DATA_RETENTION_DAYS`),
  sesuai yang dijelaskan di halaman Privasi.

Sebelum membuka repository ke publik, pastikan Git history juga tidak pernah
berisi secret produksi. Menghapus secret dari commit terbaru tidak menghapusnya
dari commit lama; rotasi secret yang pernah terekspos.

## Struktur ringkas

```text
src/
├─ app/                         # halaman, metadata, route handler
│  └─ profil/                   # publik, auth, dan area admin
├─ components/
│  ├─ admin/                    # UI pengelolaan
│  ├─ motion/                   # motion primitives
│  ├─ public/                   # halaman publik, Island, tab bar, musik
│  ├─ seo/                      # renderer structured data
│  └─ ui/                       # primitive reusable
└─ lib/
   ├─ auth/                     # session, password, permission
   ├─ database/                 # hasil mutasi dan error mapping
   ├─ site-config/              # pusat konfigurasi website
   ├─ supabase/                 # client publik/browser/admin
   └─ types/                    # kontrak database
supabase/
└─ schema.sql                   # instalasi baru & upgrade (idempoten)
```

## Pemeriksaan kualitas

```bash
npm run lint
npm run typecheck
npm run check:member-slugs
npm run check:media-formats   # registry ↔ SQL, termasuk batas ukuran unggah
npm run check:share-target
npm run check:schema   # schema.sql 2× di Postgres (PGlite) + uji RPC/RLS
npm run audit:prod
npm run build
```

Workflow GitHub Actions untuk semua pemeriksaan ini tersedia di
`docs/ci-workflow.yml`; salin ke `.github/workflows/ci.yml` agar berjalan pada
setiap pull request.

## Berkontribusi

- Cari dan pakai ulang kode yang sudah ada sebelum membuat fungsi atau file
  baru; logika yang sama ditempatkan di satu pusat lalu dipakai banyak fitur.
- Letakkan kode sesuai kategorinya (`lib/` untuk logika, `components/` untuk
  UI, `supabase/schema.sql` untuk database) dan ikuti gaya file sekitarnya.
- Pakai token desain (mis. `text-footnote`, `rounded-pin`, `text-tone-blue-text`)
  alih-alih nilai px/hex arbitrer. Token kustom baru juga didaftarkan di
  `src/lib/utils/cn.ts` agar tailwind-merge tidak membuangnya.
- Jalankan seluruh pemeriksaan kualitas di atas sebelum membuka pull request.

## Lisensi

Dirilis dengan [MIT License](./LICENSE).
