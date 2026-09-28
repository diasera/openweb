import localFont from "next/font/local";

/**
 * Font display (judul) satu-satunya: Plus Jakarta Sans variabel karya Tokotype
 * (wght 200–800, subset Latin + Latin Extended, lisensi OFL — lihat OFL.txt).
 * File di-host sendiri agar build tetap jalan tanpa akses Google Fonts.
 * Teks isi sengaja tetap memakai font sistem (SF Pro/Segoe UI/Roboto).
 * Pasang `displayFont.variable` di <html>; globals.css memetakan variabelnya
 * ke token --font-display.
 */
export const displayFont = localFont({
  src: "./plus-jakarta-sans-variable.woff2",
  variable: "--font-display-face",
  weight: "200 800",
  style: "normal",
  display: "swap",
});
