# Panduan Setup Supabase (dari nol)

Ikuti langkah ini sekali saja untuk menyiapkan database & storage.

## 1. Buat project Supabase

1. Buka <https://supabase.com> → **Sign in** → **New project**.
2. Isi **Name** (mis. `webkelas`), **Database Password** (simpan baik-baik), pilih **Region** terdekat (mis. Southeast Asia / Singapore).
3. Tunggu ±2 menit sampai project selesai dibuat.

## 2. Ambil kunci API

Buka **Project Settings** (ikon gerigi) → **API** (atau **API Keys**), catat:

| Nilai | Dipakai untuk env |
| --- | --- |
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public** key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** key (rahasia!) | `SUPABASE_SERVICE_ROLE_KEY` |

> ⚠️ **service_role** punya akses penuh ke database. Hanya untuk server. Jangan pernah taruh di kode client atau commit ke GitHub.

## 3. Isi file `.env.local`

Di root project:

```bash
cp .env.local.example .env.local
```

Lalu isi ketiga nilai di atas. Untuk `AUTH_SECRET`, buat string acak (min. 32 karakter):

```bash
# salah satu:
openssl rand -base64 32
# atau di Node:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## 4. Jalankan skema database

1. Di dashboard Supabase, buka **SQL Editor** → **New query**.
2. Salin **seluruh isi** [`schema.sql`](./schema.sql) ke editor.
3. Klik **Run**. Aman dijalankan berulang (idempotent).

Skema ini membuat 13 tabel termasuk `music_tracks`, `member_mentions`, dan
`rate_limits`, enum,
RLS, trigger `updated_at`, 5 storage bucket (`media`, `music`, `members`, `blog`,
`site`), serta 1 baris `site_settings` awal.

Untuk database lama yang sudah pernah menjalankan `schema.sql`, jalankan semua
file di folder [`migrations`](./migrations) menurut urutan nama. Migrasi
`member_mentions` melakukan backfill history tag konten lama; migrasi SEO
menambah canonical, tampilan Google, dan konfigurasi AdSense terpusat.
Migrasi `20260715_intrinsic_hero_dimensions.sql` menambahkan metadata dimensi
hero. Jalankan sebelum deploy renderer hero intrinsik; URL hero lama tetap valid
dan dimensinya akan terisi ketika gambar disimpan ulang melalui menu Setting.
Migrasi `20260715_security_hardening.sql` wajib dijalankan sebelum deploy kode
terbaru karena endpoint tulis memakai fungsi rate limit atomik. Migrasi akan
berhenti tanpa mengubah data bila menemukan owner atau URL media duplikat;
periksa dan selesaikan duplikasi tersebut, lalu jalankan ulang.
Setelah itu jalankan `20260715_web_media_formats.sql` untuk menyinkronkan MIME
bucket serta kolom format media dengan registry TypeScript.
Terakhir, jalankan `20260716_member_slug_integrity.sql` untuk memperbaiki
collision slug profil lintas nama, melindungi child route admin/auth, dan
menambahkan constraint canonical tanpa mengganti slug valid yang sudah ada.

## 5. Verifikasi

- **Table Editor** → harus muncul 13 tabel.
- **Storage** → harus muncul 5 bucket publik.
- **Authentication** tidak dipakai — login owner/admin memakai sistem cookie sendiri (username + password), bukan Supabase Auth.

## 6. Jalankan aplikasi

```bash
npm run dev
```

Buka <http://localhost:3000/profil> lalu pilih **Masuk sebagai Admin**. Karena belum ada owner, kamu otomatis diarahkan ke **Setup Owner** untuk membuat akun pertama.

---

### Kenapa RLS-nya "hanya baca"?

anon key (yang ada di browser) sengaja dikunci: cuma bisa **membaca** data publik
(media approved, anggota, blog published, lagu aktif, notifikasi, pengaturan).
Untuk tabel yang menyimpan metadata moderasi, grant kolom juga membatasi anon
agar IP, user-agent, device, dan ID internal admin tidak dapat diminta langsung.
Server memvalidasi semua mutasi. Untuk video/audio, server hanya menerbitkan URL
unggah bertanda tangan untuk satu path acak; byte file langsung menuju Storage,
sedangkan finalisasi metadata tetap diverifikasi server.
Finalisasi juga membaca header objek dari Storage dan mencocokkan signature
container dengan format pada tiket. Pemeriksaan codec/transcoding video berat
tetap harus dikerjakan worker media terpisah, bukan Edge Function atau Server
Action.
