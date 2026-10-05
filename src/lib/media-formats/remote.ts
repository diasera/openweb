"use client";

import { prepareImageFile, type PreparedMediaFile } from "./prepare";

/** Segmen terakhir path URL sebagai nama file; fallback bila kosong/rusak. */
function fileNameFromUrl(url: string, fallback: string): string {
  try {
    const segment = new URL(url, window.location.href).pathname
      .split("/")
      .pop();
    return segment ? decodeURIComponent(segment) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Unduh gambar yang sudah tersimpan lalu lewatkan ke pipeline normalisasi yang
 * sama dengan file dari input. Validasi format cukup di prepareImageFile
 * (ekstensi + klaim MIME + signature byte), jadi MIME respons tidak diperiksa
 * terpisah: storage bisa saja melayani gambar sebagai octet-stream.
 */
export async function prepareRemoteImage(
  url: string,
  {
    signal,
    fallbackName = "gambar",
    errorMessage = "Gambar tidak dapat dimuat.",
  }: { signal?: AbortSignal; fallbackName?: string; errorMessage?: string } = {},
): Promise<PreparedMediaFile> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "omit",
    signal,
  });
  if (!response.ok) throw new Error(errorMessage);
  const blob = await response.blob();
  const file = new File([blob], fileNameFromUrl(url, fallbackName), {
    type: blob.type,
    lastModified: Date.now(),
  });
  return prepareImageFile(file, signal);
}
