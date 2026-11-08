import { useCallback, useRef, useState } from "react";
import { requestSignedUpload, uploadFileDirectly } from "@/lib/uploads/client";
import type { SignedUpload } from "@/lib/uploads/types";
import { mapWithConcurrency } from "@/lib/utils/concurrency";

/** Unggahan paralel per pin: cepat tanpa membuat koneksi seluler tersendat. */
const UPLOAD_CONCURRENCY = 3;

export interface DraftUploadItem {
  /** Id draft: kunci progres per thumbnail. */
  id: string;
  file: File;
}

/**
 * Unggah langsung beberapa file media ke Storage (Buat Pin & Edit postingan):
 * progres per item + total, dan file yang sudah terkirim diingat (tiket
 * berlaku 2 jam) sehingga kirim ulang hanya mengunggah sisanya sebelum
 * finalisasi diulang. Panggil `forget()` setelah finalisasi berhasil atau
 * ditolak permanen.
 */
export function useDraftUploads() {
  const uploadedRef = useRef(new Map<File, SignedUpload>());
  const [itemProgress, setItemProgress] = useState<Record<string, number>>({});
  const [overallProgress, setOverallProgress] = useState(0);

  const uploadAll = useCallback(async (items: readonly DraftUploadItem[]) => {
    const totalBytes = items.reduce((sum, item) => sum + item.file.size, 0) || 1;
    const sent = new Map(items.map((item) => [item.id, 0]));
    const report = (id: string, bytes: number, percentage: number) => {
      sent.set(id, bytes);
      setItemProgress((current) => ({ ...current, [id]: percentage }));
      const total = [...sent.values()].reduce((sum, value) => sum + value, 0);
      setOverallProgress(Math.min(100, Math.round((total / totalBytes) * 100)));
    };

    setOverallProgress(0);
    setItemProgress({});
    return mapWithConcurrency(items, UPLOAD_CONCURRENCY, async (item) => {
      const cached = uploadedRef.current.get(item.file);
      if (cached) {
        report(item.id, item.file.size, 100);
        return cached;
      }
      const upload = await requestSignedUpload("media", item.file);
      await uploadFileDirectly(item.file, upload, ({ sent: bytes, percentage }) => {
        report(item.id, bytes, percentage);
      });
      uploadedRef.current.set(item.file, upload);
      return upload;
    });
  }, []);

  const forget = useCallback(() => uploadedRef.current.clear(), []);
  const clearProgress = useCallback(() => setItemProgress({}), []);

  return { itemProgress, overallProgress, uploadAll, forget, clearProgress };
}
