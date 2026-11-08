import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Endpoint indeks mesin pencari (sitemap + feed) ber-ISR satu jam. Setiap
 * mutasi yang menambah/menghapus URL publik memanggil ini agar Google langsung
 * melihat halaman baru — dan tidak lagi menerima URL yang sudah dihapus —
 * tanpa menunggu cache kedaluwarsa. Terpisah dari ./index karena modul itu
 * juga dipakai komponen klien.
 */
export function revalidateSeoIndexes() {
  revalidatePath("/sitemap.xml");
  revalidatePath("/feed.xml");
  revalidatePath("/feed.json");
}
