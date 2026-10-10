/**
 * Batas teks detail pin (judul, kategori, caption, nama pengunggah). Satu
 * sumber untuk form Buat Pin, validasi API unggah, dan dialog "Edit
 * postingan" admin. Modul ini bebas Zod agar aman diimpor komponen klien;
 * skema validasinya ada di ./metadata-schema.
 */
export const MEDIA_METADATA_LIMITS = {
  title: 120,
  category: 40,
  caption: 300,
  uploaderName: 60,
} as const;
