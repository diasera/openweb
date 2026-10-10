import "server-only";
import { revalidatePath } from "next/cache";
import { revalidateSeoIndexes } from "@/lib/seo/revalidate";

/** Antrean dan daftar moderasi admin; cukup untuk kiriman yang masih pending. */
export function revalidateMediaAdminPages() {
  revalidatePath("/profil/media");
  revalidatePath("/profil");
}

/**
 * Daftar tunggal halaman yang menampilkan media. Dipakai moderasi, unggah,
 * dan edit postingan: halaman publik ber-ISR 30–60 detik, jadi halaman yang terlewat
 * tetap menayangkan pin yang sudah ditolak/dihapus (gambarnya pun sudah
 * kembali ke inbox privat sehingga tampil rusak).
 */
export function revalidateMediaPages(mediaId?: string) {
  revalidateMediaAdminPages();
  revalidatePath("/");
  revalidatePath("/galeri");
  // Sampul dan jumlah album dihitung dari media yang disetujui.
  revalidatePath("/album");
  revalidatePath("/album/[slug]", "page");
  // Riwayat aktivitas anggota memuat media yang menyebut namanya.
  revalidatePath("/profil/[slug]", "page");
  if (mediaId) revalidatePath(`/pin/${mediaId}`);
  // Pin terbit/ditarik menambah/menghapus URL /pin/… di sitemap.
  revalidateSeoIndexes();
}
