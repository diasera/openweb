## Ringkasan

<!-- Apa yang diubah dan mengapa? Tautkan issue terkait, mis. "Closes #12". -->

## Jenis perubahan

- [ ] 🐞 Perbaikan bug
- [ ] ✨ Fitur baru
- [ ] ♻️ Refactor (tanpa perubahan perilaku)
- [ ] 🗄️ Perubahan database (`supabase/schema.sql`)
- [ ] 📝 Dokumentasi
- [ ] 🔧 Tooling / CI / dependensi

## Tangkapan layar

<!-- Untuk perubahan UI: sertakan tema terang & gelap, mobile & desktop bila relevan. -->

## Checklist

- [ ] Saya sudah mencari dan memakai ulang kode yang ada (Pola Sarang Laba-Laba, lihat `AGENTS.md`).
- [ ] Tidak ada logika ganda; kode diletakkan di folder sesuai kategorinya.
- [ ] Perubahan `schema.sql` (bila ada) idempoten dan diuji di `scripts/check-schema.mjs`.
- [ ] `npm run lint`, `npm run typecheck`, dan `npm run build` lulus.
- [ ] Seluruh `npm run check:*` lulus.
- [ ] Dokumentasi dan entri `[Unreleased]` di `CHANGELOG.md` sudah diperbarui.
