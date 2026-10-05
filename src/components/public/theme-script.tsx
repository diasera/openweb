import { STORAGE_KEYS } from "@/lib/utils/storage";

/**
 * Skrip anti-FOUC (Server Component, tanpa JS klien): pilihan tersimpan
 * menang; selain itu ikuti tema perangkat. Berjalan sebelum hidrasi sehingga
 * ThemeToggle cukup membaca kelas `dark` di <html>.
 */
export function ThemeScript() {
  const key = JSON.stringify(STORAGE_KEYS.theme);
  const js = `try{var t=localStorage.getItem(${key});var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d)}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
