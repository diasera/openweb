/**
 * Helper akses environment variable + pesan error yang jelas.
 * Pure function (tanpa menyentuh secret) supaya aman diimpor dari mana pun.
 * Dipakai ulang oleh seluruh Supabase client & modul auth.
 */
export function requiredEnv(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new Error(
      `Environment variable "${name}" belum diisi. ` +
        `Salin .env.local.example menjadi .env.local lalu isi nilainya dari dashboard Supabase.`,
    );
  }
  return value;
}

const EXAMPLE_SECRETS = new Set([
  "change-me",
  "replace-me",
  "your-secret",
  "ganti-dengan-string-acak-minimal-32-karakter",
]);

/**
 * Nilai contoh dari .env.local.example (mis. YOUR-PROJECT-REF, your-anon-key)
 * diperlakukan sebagai "belum diisi" agar salinan mentah tetap berjalan di mode demo.
 */
export function isEnvConfigured(value: string | undefined): value is string {
  const trimmed = value?.trim() ?? "";
  return (
    trimmed !== "" &&
    !EXAMPLE_SECRETS.has(trimmed.toLowerCase()) &&
    !/your[-_]|YOUR-PROJECT-REF/i.test(trimmed)
  );
}

/** Validasi secret kriptografi; bukan sekadar memastikan env terisi. */
export function requiredSecret(
  name: string,
  value: string | undefined,
  minimumBytes = 32,
): string {
  const secret = requiredEnv(name, value).trim();
  if (
    new TextEncoder().encode(secret).byteLength < minimumBytes ||
    EXAMPLE_SECRETS.has(secret.toLowerCase())
  ) {
    throw new Error(
      `Environment variable "${name}" harus berupa secret acak minimal ${minimumBytes} byte dan bukan nilai contoh.`,
    );
  }
  return secret;
}
