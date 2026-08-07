# Ruang Bersama

Template website komunitas yang dapat dikustomisasi dari panel admin tanpa
mengubah source code. Cocok untuk kelas kuliah, sekolah, organisasi, komunitas,
usaha kecil, maupun portofolio kelompok.

Antarmukanya terinspirasi pola interaksi iOS dan susunan media Pinterest,
dengan satu Dynamic Island untuk navigasi, status proses, notifikasi, dan
kontrol musik. Proyek ini bukan produk resmi dan tidak berafiliasi dengan
Apple atau Pinterest.

## Fitur utama

- Identitas, jenis website, istilah anggota, bahasa, zona waktu, kontak,
  tautan sosial, warna, logo, favicon, dan hero dapat diatur dari Profil Admin.
- Galeri foto/video, pin pilihan di homepage, komentar, dan unggahan publik
  dengan moderasi admin.
- Blog dengan editor rich text, cover, kategori, tag, draft, dan publikasi.
- Profil anggota dengan URL ramah baca seperti `/profil/siti-sholeh` serta
  riwayat media dan artikel yang menyebut nama anggota.
- Pesan anonim; hanya pesan yang dipin admin ditampilkan di homepage.
- Playlist audio persisten dengan putar, jeda, seek, next/previous, Media
  Session, dan kontrol Dynamic Island.
- Tema terang/gelap, motion lintas halaman, tab bar responsif, serta dukungan
  `prefers-reduced-motion`.
- Owner dan admin dengan izin per fitur, statistik, moderasi IP, notifikasi,
  dan pengelolaan konten dari tab Profil yang sama.
- SEO terpusat: site name, canonical URL, judul/deskripsi homepage, gambar
  sosial, sitemap, robots, structured data, Search Console, Bing, Analytics,
  dan konfigurasi AdSense.
- Supabase Postgres + Storage dengan RLS dan signed upload; file besar tidak
  melewati Server Action.
- Registry format media terpusat, pemeriksaan signature byte, normalisasi
  HEIC/HEIF iPhone yang lazy-loaded, serta alias format lintas iOS/Android.

## Prinsip arsitektur

- `src/lib/site-config/` adalah pusat validasi, default, pilihan, dan runtime
  konfigurasi website.
- `src/components/public/dynamic-island/` adalah satu-satunya pemilik visual
  Dynamic Island; feedback fitur masuk melalui kanal yang sama.
- `src/lib/data/` memusatkan pembacaan data publik dan fallback demo.
- `src/lib/database/` memusatkan kontrak mutasi dan pesan error database.
- `src/lib/media-formats/` memusatkan format ingest, MIME storage, signature,
  normalisasi, dan probe playback untuk seluruh picker serta API.
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

Panduan rinci tersedia di [`supabase/README.md`](./supabase/README.md).

Untuk database yang sudah ada, jalankan file dalam
`supabase/migrations/` sesuai urutan nama. Simpan backup database sebelum
menerapkan migrasi produksi.

Migrasi pertama menambahkan rate limit
atomik, tracking atomik, pembatasan kolom publik, owner tunggal, dan pencegahan
replay finalisasi media. Bila ada owner atau URL media duplikat, migrasi berhenti
dengan pesan jelas agar data diperiksa terlebih dahulu, bukan dihapus otomatis.
Migrasi kedua menyinkronkan alias MIME bucket dan metadata format media.
Migrasi terakhir memperbaiki collision URL profil lama, melindungi route admin,
dan mempertahankan slug valid yang sudah dipublikasikan.

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

Jalankan `npm run check:media-formats` setelah mengubah registry atau SQL.
Daftar lisensi decoder pihak ketiga tersedia di
[`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).

## Konfigurasi tanpa mengubah kode

Menu Pengaturan memusatkan konfigurasi berikut:

- nama website, nama alternatif, tipe website, locale, dan zona waktu;
- istilah tunggal/jamak anggota, nomor identitas, dan kelompok inti;
- deskripsi, tagline, hero, logo, favicon, warna, visi, dan misi;
- email, telepon, alamat, footer, dan tautan sosial;
- daftar keyword/topik yang dinormalisasi dan dihapus duplikasinya;
- canonical URL, kontrol indexing, metadata homepage, dan gambar sosial;
- kode verifikasi Google/Bing, Google Analytics, dan Google AdSense.

Keyword membantu pengelola menyusun topik dan konten yang konsisten, tetapi
tidak menjamin posisi pencarian. Mesin pencari menilai kualitas serta relevansi
konten, aksesibilitas, performa, reputasi, dan banyak sinyal lain. Aplikasi juga
tidak menjanjikan peringkat nomor satu atau persetujuan AdSense.

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
├─ schema.sql                   # instalasi database baru
├─ migrations/                  # upgrade instalasi lama
└─ README.md                    # panduan Supabase
```

## Pemeriksaan kualitas

```bash
npm run lint
npm run typecheck
npm run check:member-slugs
npm run check:media-formats
npm run audit:prod
npm run build
```

Workflow GitHub Actions menjalankan ketiganya pada push dan pull request.

## Berkontribusi

## Lisensi

Dirilis dengan [MIT License](./LICENSE).
