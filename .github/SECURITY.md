# Kebijakan Keamanan

Keamanan pengguna Ruang Bersama adalah prioritas. Terima kasih telah membantu
menjaga proyek ini tetap aman.

## Versi yang didukung

Perbaikan keamanan hanya dirilis untuk versi minor terbaru.

| Versi | Didukung |
| --- | --- |
| 1.1.x | ✅ |
| < 1.1 | ❌ |

## Melaporkan celah keamanan

**Jangan laporkan celah keamanan melalui issue, discussion, atau pull request
publik.**

Laporkan secara privat melalui
[GitHub Security Advisories](https://github.com/diasera/openweb/security/advisories/new)
(tab **Security → Report a vulnerability**).

Sertakan sebanyak mungkin informasi berikut:

- Jenis celah (mis. XSS, SQL injection, bypass RLS, kebocoran sesi admin).
- Lokasi file/route yang terdampak beserta commit atau versi.
- Langkah reproduksi atau proof-of-concept.
- Dampak yang mungkin terjadi dan konfigurasi khusus yang dibutuhkan.

## Yang dapat kamu harapkan

| Tahap | Target waktu |
| --- | --- |
| Konfirmasi laporan diterima | 3 hari kerja |
| Penilaian awal & tingkat keparahan | 7 hari kerja |
| Perbaikan dirilis (tergantung keparahan) | secepatnya, maks. 90 hari |

Kami akan mengabarimu selama proses berlangsung dan mencantumkan namamu di
catatan rilis (bila kamu berkenan) setelah perbaikan dipublikasikan.

## Cakupan

Termasuk cakupan:

- Kode di repository ini (`src/`, `supabase/schema.sql`, `scripts/`,
  `public/sw.js`).
- Kebijakan RLS, RPC, dan bucket Storage yang didefinisikan di `schema.sql`.

Di luar cakupan:

- Celah pada layanan pihak ketiga (Supabase, Vercel, dsb.) — laporkan langsung
  ke penyedianya.
- Instalasi yang salah konfigurasi oleh pemiliknya (mis. service role key yang
  terekspos, `TRUSTED_PROXY` yang tidak sesuai).
- Serangan yang memerlukan akses fisik ke perangkat atau akun owner.

## Praktik keamanan bagi pemilik instalasi

- Jangan pernah commit `.env`, `.env.local`, service role key, atau
  `AUTH_SECRET`. Rotasi secret yang pernah terekspos, termasuk di Git history.
- Jalankan ulang `supabase/schema.sql` setiap memperbarui aplikasi agar
  kebijakan RLS dan fungsi keamanan terbaru ikut terpasang.
- Biarkan `TRUSTED_PROXY` kosong kecuali origin hanya menerima trafik dari
  proxy tepercaya.
- Selalu perbarui ke versi terbaru.

Ringkasan mekanisme keamanan aplikasi tersedia di bagian
[Keamanan](../docs/ARCHITECTURE.md#keamanan-berlapis) pada dokumentasi arsitektur.
