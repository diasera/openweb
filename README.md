<div align="center">

<img src="src/app/icon.svg" alt="Logo Ruang Bersama" width="84" height="84" />

# Ruang Bersama

**Platform web komunitas open source — kelola seluruh identitas, galeri, artikel, agenda, dan anggota langsung dari panel admin, tanpa menyentuh kode.**

[![CI](https://github.com/diasera/openweb/actions/workflows/ci.yml/badge.svg)](https://github.com/diasera/openweb/actions/workflows/ci.yml)
[![Versi](https://img.shields.io/github/package-json/v/diasera/openweb?label=versi&color=ff2d55)](./CHANGELOG.md)
[![Lisensi MIT](https://img.shields.io/github/license/diasera/openweb?label=lisensi&color=007aff)](./LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22.12%20(24%20LTS)-339933?logo=nodedotjs&logoColor=white)](./.nvmrc)
[![PR Welcome](https://img.shields.io/badge/PR-welcome-34c759)](./.github/CONTRIBUTING.md)

[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev)
[![TypeScript 6](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_%2B_Storage-3fcf8e?logo=supabase&logoColor=white)](https://supabase.com)

[**Lihat Demo Langsung ↗**](https://mbsc.my.id) ·
[**Mulai Cepat**](#-mulai-cepat) ·
[**Deploy**](#-deploy-ke-vercel) ·
[**Arsitektur**](./docs/ARCHITECTURE.md) ·
[**Laporkan Bug**](https://github.com/diasera/openweb/issues/new?template=bug_report.yml) ·
[**Usulkan Fitur**](https://github.com/diasera/openweb/issues/new?template=feature_request.yml)

</div>

---

**Ruang Bersama** dirancang untuk kelas kuliah, sekolah, himpunan, komunitas hobi, organisasi, hingga portofolio kolektif. Antarmukanya memadukan susunan visual **Pinterest** (masonry & pin carousel) dengan pola interaksi **iOS** (Dynamic Island, spring motion CSS murni, dan tema adaptif terang/gelap).

> *Proyek independen berlisensi MIT — tidak berafiliasi dengan Apple maupun Pinterest.*

---

## ✨ Mengapa Ruang Bersama?

| Fitur | Apa yang kamu dapatkan |
| :--- | :--- |
| 🎛️ **Kustomisasi penuh tanpa kode** | Nama situs, warna merek (kontras WCAG AA otomatis), logo, hero beranda, sebutan anggota (*mahasiswa / siswa / pengurus*), kontak, dan SEO diatur langsung dari **Profil Admin → Pengaturan**. |
| 🖼️ **Galeri Masonry & Pin Carousel** | Unggahan publik ber-moderasi dengan hingga **10 foto/video per pin**, editor foto bawaan (crop, rotasi, filter, konversi HEIC iPhone otomatis), album kegiatan, dan fitur *Kenangan hari ini*. |
| 🏝️ **Dynamic Island serbaguna** | Satu pusat kendali untuk navigasi cepat, progres unggah real-time, lonceng notifikasi, **Live Activity** hitung mundur agenda (H-7), dan pemutar musik latar lintas-halaman. |
| 🔎 **Spotlight bahasa Indonesia** | Pencarian instan (`⌘K` / `Ctrl+K`) dengan *full-text stemming* bahasa Indonesia lintas pin galeri, artikel blog, profil anggota (termasuk NIM/nomor identitas), album, dan agenda. |
| ✍️ **Blog, Agenda & Mention dua arah** | Editor artikel rich-text, filter kategori & `#tag` lintas halaman, ekspor kalender `.ics` / Google Calendar, serta tautan otomatis antara profil anggota dan pin/artikel yang menyebut mereka. |
| 📱 **PWA & Web Share Target** | Dapat dipasang ke layar utama, menerima kiriman foto/video langsung dari menu **Bagikan** galeri Android ke komposer pin, dan mendukung notifikasi **Web Push (VAPID)**. |
| 🛡️ **Keamanan berlapis sejak awal** | Row Level Security (RLS) ketat, karantina kiriman publik di bucket privat `media-inbox`, verifikasi *magic-bytes* file, rate-limit atomik di Postgres, sesi admin `HttpOnly`, dan retensi privasi 180 hari. |
| 🧪 **Jalan instan dengan Mode Demo** | Tanpa konfigurasi Supabase pun aplikasi langsung menyala memakai data demo — ideal untuk eksplorasi desain dan pengembangan UI lokal. |

---

## 🚀 Mulai cepat

**Persyaratan:** Node.js **24 LTS** (minimal `22.12+`, tersedia di `.nvmrc`) dan `npm` **11**.

```bash
git clone https://github.com/diasera/openweb.git
cd openweb
npm install
cp .env.local.example .env.local
npm run dev
```

> **Pengguna Windows PowerShell:** ganti baris salin env dengan `Copy-Item .env.local.example .env.local`.

Buka **<http://localhost:3000>**.
- Selama `.env.local` masih berisi nilai contoh, situs berjalan dalam **Mode Demo**.
- Begitu Supabase dihubungkan, membuka tab **Profil** pertama kali akan memandu pembuatan akun **Owner**.

---

## 🗄️ Menyiapkan Supabase

Untuk mengaktifkan penyimpanan database, unggahan media, dan panel admin:

1. Buat project baru di [Supabase](https://supabase.com/dashboard).
2. Buka **SQL Editor**, salin seluruh isi [`supabase/schema.sql`](./supabase/schema.sql), lalu klik **Run**.
   *(Skrip ini 100% idempoten: membuat tabel, indeks pencarian, bucket Storage, fungsi RPC, dan kebijakan RLS sekaligus — serta aman dijalankan ulang setiap kali kamu memperbarui versi aplikasi).*
3. Isi variabel di `.env.local` sesuai bagian [Environment](#-environment) di bawah.
4. Jalankan `npm run dev`, buka **Profil**, buat akun **Owner pertama**, lalu masuk ke **Pengaturan** untuk mengganti seluruh identitas situs.

---

## 🔑 Environment

Salin `.env.local.example` ke `.env.local` lalu sesuaikan nilainya:

| Variabel | Wajib | Rahasia | Kegunaan |
| :--- | :---: | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Ya* | Tidak | URL project Supabase (`https://<ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Ya* | Tidak | Anon public key Supabase (dibatasi penuh oleh RLS). |
| `SUPABASE_SERVICE_ROLE_KEY` | Ya* | **Ya** | Service role key khusus server untuk mutasi tervalidasi & signed upload. |
| `AUTH_SECRET` | Ya* | **Ya** | Kunci HMAC cookie sesi admin (minimal 32 karakter acak, mis. `openssl rand -base64 32`). |
| `NEXT_PUBLIC_SITE_URL` | Opsional | Tidak | Fallback origin kanonis sebelum URL utama disimpan di menu Pengaturan SEO. |
| `NEXT_PUBLIC_SITE_TIME_ZONE` | Opsional | Tidak | Zona waktu IANA untuk agenda & *Kenangan hari ini* (bawaan: `Asia/Jakarta`). |
| `TRUSTED_PROXY` | Opsional | Tidak | Sumber header IP untuk *self-hosted* (`cloudflare` \| `x-real-ip` \| `x-forwarded-for`). Vercel terdeteksi otomatis; biarkan kosong bila ragu. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Opsional | Tidak | Kunci publik Web Push (`npx web-push generate-vapid-keys`). Tanpa ini, lonceng tetap bekerja *in-app*. |
| `VAPID_PRIVATE_KEY` | Opsional | **Ya** | Kunci privat Web Push untuk mengirim notifikasi ke perangkat pengunjung. |
| `VAPID_SUBJECT` | Opsional | Tidak | Kontak pengirim Web Push (mis. `mailto:admin@domainmu.id`). |

*\*Tanpa keempat variabel pertama, aplikasi tetap berjalan normal dalam Mode Demo (hanya-baca).*

---

## ☁️ Deploy ke Vercel

1. **Fork** repository ini ke akun GitHub-mu.
2. Siapkan project Supabase dan jalankan [`supabase/schema.sql`](./supabase/schema.sql).
3. Buka [vercel.com/new](https://vercel.com/new) dan impor repository hasil fork.
4. Tambahkan minimal `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, dan `AUTH_SECRET` pada **Environment Variables**.
5. Klik **Deploy**, buka domain barumu → tab **Profil** untuk membuat akun Owner → **Pengaturan → SEO** untuk mengisi URL utama agar `/sitemap.xml`, `/robots.txt`, `/feed.xml`, `/feed.json`, dan kartu Open Graph memakai domain produksi.

**Self-hosted (Node.js / Docker / VPS):** jalankan `npm run build && npm run start` pada Node.js `>=22.12`. Jika berada di balik reverse proxy (Cloudflare/Nginx), atur `TRUSTED_PROXY` hanya bila proxy selalu menimpa header IP dari klien.

---

## 🧭 Struktur repository

Repository ini mengikuti **Pola Sarang Laba-Laba** — satu pusat logika melayani banyak fitur tanpa kode berulang. Penjelasan lengkap mengenai alur media, batas ukuran unggah, sistem motion 3D, dan keamanan tersedia di **[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)**.

```text
.
├─ src/
│  ├─ proxy.ts                  # Proxy request Next.js (bypass pemotongan body untuk Server Action foto)
│  ├─ app/                      # App Router: halaman publik, area profil/admin, SEO endpoints, dan /api/*
│  ├─ components/
│  │  ├─ ui/                    # Primitif desain (Button, Card, Chip, Avatar, MediaCarousel, Skeleton, ...)
│  │  ├─ motion/                # Sistem animasi pegas CSS murni, efek kedalaman 3D, dan RouteSkeleton
│  │  ├─ public/                # Shell publik, Dynamic Island, Spotlight, komposer pin, pemutar musik
│  │  ├─ admin/                 # Kit komponen panel admin bersama
│  │  ├─ media-editor/          # Editor foto non-destruktif (crop, rotasi, koreksi warna, filter)
│  │  ├─ auth/                  # Form login & setup owner pertama
│  │  └─ seo/                   # Komponen JSON-LD terstruktur
│  └─ lib/                      # Pusat logika terorganisasi per domain (site-config, media, security, seo, ...)
├─ supabase/
│  └─ schema.sql                # Skema database, bucket Storage, RPC, dan RLS (idempoten untuk instalasi & upgrade)
├─ scripts/                     # Skrip verifikasi otomatis (schema PGlite, format media, slug anggota, share target)
├─ docs/
│  └─ ARCHITECTURE.md           # Dokumentasi mendalam arsitektur, keamanan, dan alur teknis
└─ .github/                     # Workflow CI, panduan kontribusi, kebijakan keamanan, dan template Issue/PR
```

---

## 🧪 Skrip & pemeriksaan kualitas

Seluruh skrip di bawah ini juga dijalankan otomatis oleh [GitHub Actions CI](./.github/workflows/ci.yml) pada setiap push dan pull request:

| Perintah | Kegunaan |
| :--- | :--- |
| `npm run dev` | Menjalankan server pengembangan lokal di `http://localhost:3000`. |
| `npm run build` | Membangun bundel produksi Next.js. |
| `npm run start` | Menjalankan server produksi dari hasil `build`. |
| `npm run lint` | Memeriksa kualitas kode dengan ESLint. |
| `npm run typecheck` | Memeriksa tipe statis dengan TypeScript (`tsc --noEmit`). |
| `npm run check:member-slugs` | Menguji determinisme dan keunikan generator slug profil anggota. |
| `npm run check:media-formats` | Memastikan sinkronisasi registry MIME/ukuran media antara TypeScript dan `schema.sql`. |
| `npm run check:share-target` | Memastikan konstanta PWA Share Target selaras dengan `public/sw.js`. |
| `npm run check:schema` | Menjalankan `supabase/schema.sql` 2× di Postgres lokal (PGlite) serta menguji RPC & RLS. |
| `npm run audit:prod` | Memeriksa celah keamanan pada dependensi produksi. |

---

## 🤝 Berkontribusi & komunitas

Kontribusi dalam bentuk laporan bug, usulan fitur, perbaikan dokumentasi, maupun pull request sangat terbuka!

- 📖 **[Panduan Berkontribusi (`CONTRIBUTING.md`)](./.github/CONTRIBUTING.md)** — alur kerja PR, aturan Pola Sarang Laba-Laba, dan format commit.
- 📐 **[Arsitektur Teknis (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md)** — peta modul `src/lib/`, alur media, keamanan, dan keputusan desain.
- 🤖 **[Aturan Pengembangan (`AGENTS.md`)](./AGENTS.md)** — prinsip kebersihan kode dan penempatan kategori folder.
- 📜 **[Kode Etik (`CODE_OF_CONDUCT.md`)](./.github/CODE_OF_CONDUCT.md)** — standar interaksi komunitas yang ramah dan inklusif.
- 🔒 **[Kebijakan Keamanan (`SECURITY.md`)](./.github/SECURITY.md)** — cara melaporkan celah keamanan secara privat.
- 🗂️ **[Riwayat Perubahan (`CHANGELOG.md`)](./CHANGELOG.md)** — catatan rilis per versi.

<a href="https://github.com/diasera/openweb/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=diasera/openweb" alt="Kontributor Ruang Bersama" />
</a>

---

## 📄 Lisensi

Dirilis di bawah **[MIT License](./LICENSE)**. Lisensi pustaka pihak ketiga dicantumkan di **[`THIRD_PARTY_NOTICES.md`](./.github/THIRD_PARTY_NOTICES.md)**.

<div align="center">

Dibuat dengan 💙 untuk komunitas Indonesia. Jika proyek ini bermanfaat, jangan lupa beri **⭐ Star** di GitHub!

</div>
