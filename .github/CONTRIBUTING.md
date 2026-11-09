# Panduan Berkontribusi

Terima kasih sudah tertarik membantu **Ruang Bersama**! Setiap kontribusi —
laporan bug, ide fitur, perbaikan typo, sampai pull request besar — sangat
berarti. Dokumen ini menjelaskan cara berkontribusi agar repository tetap rapi,
konsisten, dan mudah dirawat bersama.

Dengan berpartisipasi, kamu setuju mengikuti [Kode Etik](./CODE_OF_CONDUCT.md).

## Daftar isi

- [Cara berkontribusi](#cara-berkontribusi)
- [Menyiapkan lingkungan](#menyiapkan-lingkungan)
- [Aturan pengembangan](#aturan-pengembangan)
- [Alur kerja pull request](#alur-kerja-pull-request)
- [Pesan commit](#pesan-commit)
- [Perubahan database](#perubahan-database)
- [Rilis dan versi](#rilis-dan-versi)

## Cara berkontribusi

| Ingin… | Lakukan |
| --- | --- |
| Melaporkan bug | Buka [issue Bug](https://github.com/diasera/openweb/issues/new?template=bug_report.yml) dengan langkah reproduksi yang jelas. |
| Mengusulkan fitur | Buka [issue Fitur](https://github.com/diasera/openweb/issues/new?template=feature_request.yml) dan jelaskan masalah yang ingin diselesaikan. |
| Melaporkan celah keamanan | **Jangan** buka issue publik — ikuti [SECURITY.md](./SECURITY.md). |
| Mengirim kode | Fork → branch → pull request (lihat di bawah). |

Untuk perubahan besar, diskusikan dulu lewat issue agar arah implementasinya
disepakati sebelum kamu menghabiskan waktu menulis kode.

## Menyiapkan lingkungan

Persyaratan: Node.js 24 LTS (lihat `.nvmrc`; 22.12+ didukung) dan npm 11.

```bash
git clone https://github.com/<username>/openweb.git
cd openweb
npm install
cp .env.local.example .env.local   # biarkan nilai contoh untuk mode demo
npm run dev
```

Tanpa Supabase, aplikasi berjalan memakai data demo. Untuk menguji fitur yang
menulis data, siapkan project Supabase sesuai bagian
[Menyiapkan Supabase](../README.md#menyiapkan-supabase) di README.

## Aturan pengembangan

Repository ini memakai **Pola Sarang Laba-Laba**: logika inti dikumpulkan di
satu pusat, lalu dipakai ulang oleh banyak fitur. Aturan lengkapnya ada di
[`AGENTS.md`](../AGENTS.md) dan [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md); ringkasannya:

1. **Cari sebelum membuat.** Sebelum menulis fungsi, komponen, atau file baru,
   cek apakah sudah ada yang bisa dipakai ulang atau diperluas.
2. **Tanpa kode ganda.** Bila logika yang sama muncul di lebih dari satu
   tempat, pindahkan ke satu pusat lalu panggil dari sana.
3. **Analisis sebelum mengubah.** Pahami alur fitur dan dampak perubahan;
   jangan copy-paste tanpa memahami kodenya.
4. **Letakkan sesuai kategori.**
   - `src/lib/` — logika, data, validasi, utilitas
   - `src/components/` — UI (`ui/` primitif, `public/` halaman publik,
     `admin/` panel admin)
   - `src/app/` — route, metadata, route handler
   - `supabase/schema.sql` — seluruh perubahan database
   - `scripts/` — pemeriksaan otomatis
5. **Ikuti gaya sekitar.** Pakai token desain (`text-footnote`, `rounded-pin`,
   `text-tone-blue-text`, …) alih-alih nilai px/hex arbitrer. Token kustom baru
   juga didaftarkan di `src/lib/utils/cn.ts` agar tailwind-merge tidak
   membuangnya.
6. **Refactor dengan hati-hati.** Rapikan kode yang mulai berulang atau sulit
   dibaca, tetapi pastikan fitur lama tetap berjalan.

Bahasa dokumentasi, komentar kode, dan teks antarmuka adalah **Bahasa
Indonesia**.

## Alur kerja pull request

1. Fork repository, lalu buat branch dari `main`:
   `feat/filter-album`, `fix/upload-heic`, `docs/readme-deploy`, dst.
2. Buat perubahan sekecil dan sefokus mungkin — satu PR untuk satu tujuan.
3. Jalankan seluruh pemeriksaan kualitas secara lokal:

   ```bash
   npm run lint
   npm run typecheck
   npm run check:member-slugs
   npm run check:media-formats
   npm run check:share-target
   npm run check:schema
   npm run build
   ```

4. Perbarui dokumentasi (README/CHANGELOG) bila perilaku atau konfigurasi
   berubah. Tambahkan entri di bagian `[Unreleased]` pada
   [CHANGELOG.md](../CHANGELOG.md).
5. Buka pull request dan isi template-nya. Sertakan tangkapan layar untuk
   perubahan UI (terang **dan** gelap, mobile **dan** desktop bila relevan).

CI menjalankan pemeriksaan yang sama pada setiap pull request; PR baru digabung
setelah semuanya hijau dan sudah ditinjau.

## Pesan commit

Gunakan format [Conventional Commits](https://www.conventionalcommits.org/id/)
agar riwayat mudah dibaca dan CHANGELOG mudah disusun:

```text
<tipe>(<cakupan opsional>): <ringkasan singkat>
```

| Tipe | Kegunaan |
| --- | --- |
| `feat` | Fitur baru |
| `fix` | Perbaikan bug |
| `refactor` | Perubahan struktur tanpa mengubah perilaku |
| `perf` | Peningkatan performa |
| `docs` | Dokumentasi saja |
| `style` | Format kode/CSS tanpa perubahan logika |
| `test` | Menambah atau memperbaiki pemeriksaan |
| `chore` | Dependensi, konfigurasi, tooling |
| `ci` | Workflow GitHub Actions |

Contoh: `feat(galeri): filter berdasarkan kategori`,
`fix(upload): tolak file M4P dengan pesan jelas`.

## Perubahan database

- Semua perubahan skema ditulis di `supabase/schema.sql` dan **wajib
  idempoten** (`create … if not exists`, `drop … if exists`,
  `create or replace`), karena file yang sama dipakai untuk instalasi baru
  maupun upgrade.
- Perbarui kontrak TypeScript di `src/lib/types/database.ts`.
- Tambahkan uji di `scripts/check-schema.mjs` untuk RPC/RLS baru;
  `npm run check:schema` menjalankan skema dua kali di Postgres (PGlite).
- Fitur baru harus tetap tampil wajar (kosong, bukan error) sebelum admin
  menjalankan ulang `schema.sql`.

## Rilis dan versi

Proyek ini mengikuti [Semantic Versioning](https://semver.org/lang/id/):

- **MAJOR** — perubahan yang merusak kompatibilitas (mis. migrasi manual wajib).
- **MINOR** — fitur baru yang kompatibel; migrasi `schema.sql` idempoten.
- **PATCH** — perbaikan bug tanpa fitur baru.

Maintainer memperbarui `version` di `package.json`, memindahkan entri
`[Unreleased]` di CHANGELOG ke versi baru, lalu membuat tag `vX.Y.Z`.

---

Masih bingung? Buka issue dan tanyakan saja — tidak ada pertanyaan yang
terlalu sederhana. 💙
