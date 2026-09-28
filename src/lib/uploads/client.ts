"use client";

import { postJson } from "@/lib/api/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import {
  descriptorFromFile,
  PUBLIC_UPLOAD_CACHE_CONTROL,
  validateUploadDescriptor,
} from "./policy";
import type {
  DirectUploadKind,
  DirectUploadProgress,
  SignedUpload,
} from "./types";

const TUS_CHUNK_BYTES = 6 * 1024 * 1024;
const TUS_RETRY_DELAYS = [0, 3_000, 5_000, 10_000, 20_000];

export async function requestSignedUpload(
  kind: DirectUploadKind,
  file: File,
): Promise<SignedUpload> {
  const descriptor = descriptorFromFile(kind, file);
  const policy = validateUploadDescriptor(descriptor);
  if (!policy.ok) throw new Error(policy.error);

  const data = await postJson<Partial<SignedUpload>>(
    "/api/uploads/sign",
    descriptor,
    "Gagal menyiapkan unggahan.",
  );
  if (
    !data.bucket ||
    !data.path ||
    !data.signedUrl ||
    !data.uploadToken ||
    !data.ticket
  ) {
    throw new Error("Respons persiapan unggahan tidak lengkap.");
  }
  return data as SignedUpload;
}

function reportProgress(
  onProgress: ((progress: DirectUploadProgress) => void) | undefined,
  sent: number,
  total: number,
) {
  onProgress?.({
    sent,
    total,
    percentage: total > 0 ? Math.round((sent / total) * 100) : 0,
  });
}

async function uploadSignedFile(
  file: File,
  signed: SignedUpload,
  onProgress?: (progress: DirectUploadProgress) => void,
) {
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const anonKey = getSupabaseAnonKey();
    const body = new FormData();
    body.append("cacheControl", PUBLIC_UPLOAD_CACHE_CONTROL);
    body.append("", file);
    request.open("PUT", signed.signedUrl);
    request.setRequestHeader("apikey", anonKey);
    request.setRequestHeader("authorization", `Bearer ${anonKey}`);
    request.setRequestHeader("x-upsert", "false");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) reportProgress(onProgress, event.loaded, event.total);
    };
    request.onerror = () => {
      reject(new Error("Unggahan terputus. Periksa koneksi lalu coba lagi."));
    };
    request.onabort = () => reject(new Error("Unggahan dibatalkan."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        reportProgress(onProgress, file.size, file.size);
        resolve();
        return;
      }
      reject(new Error("Gagal mengunggah file ke penyimpanan."));
    };
    request.send(body);
  });
}

function getResumableUploadEndpoint(supabaseUrl: string) {
  const endpoint = new URL(supabaseUrl);
  const isSupabasePlatformHost =
    /\.supabase\.(?:co|in|red)$/i.test(endpoint.hostname) &&
    !endpoint.hostname.includes(".storage.supabase.");

  if (isSupabasePlatformHost) {
    endpoint.hostname = endpoint.hostname.replace(
      ".supabase.",
      ".storage.supabase.",
    );
  }
  endpoint.pathname = "/storage/v1/upload/resumable";
  endpoint.search = "";
  endpoint.hash = "";
  return endpoint.toString();
}

async function uploadResumableFile(
  file: File,
  signed: SignedUpload,
  onProgress?: (progress: DirectUploadProgress) => void,
) {
  const anonKey = getSupabaseAnonKey();
  const supabaseUrl = getSupabaseUrl();
  const { Upload } = await import("tus-js-client");

  await new Promise<void>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: getResumableUploadEndpoint(supabaseUrl),
      chunkSize: TUS_CHUNK_BYTES,
      retryDelays: TUS_RETRY_DELAYS,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        "x-signature": signed.uploadToken,
      },
      metadata: {
        bucketName: signed.bucket,
        objectName: signed.path,
        contentType: file.type,
        cacheControl: PUBLIC_UPLOAD_CACHE_CONTROL,
      },
      onProgress: (sent, total) => reportProgress(onProgress, sent, total),
      onError: (error) => {
        console.error("[upload:tus] unggahan gagal", {
          name: error.name,
          message: error.message,
        });
        reject(new Error("Unggahan terputus. Periksa koneksi lalu coba lagi."));
      },
      onSuccess: () => {
        reportProgress(onProgress, file.size, file.size);
        resolve();
      },
    });

    upload.start();
  });
}

/**
 * Satu pintu upload untuk seluruh fitur. Berkas kecil memakai signed PUT;
 * berkas besar memakai TUS 6 MiB agar tetap langsung ke Supabase, dapat
 * melanjutkan tiap chunk saat koneksi goyah, dan tidak melewati Vercel.
 */
export async function uploadFileDirectly(
  file: File,
  signed: SignedUpload,
  onProgress?: (progress: DirectUploadProgress) => void,
) {
  reportProgress(onProgress, 0, file.size);
  if (file.size > TUS_CHUNK_BYTES) {
    await uploadResumableFile(file, signed, onProgress);
    return;
  }
  await uploadSignedFile(file, signed, onProgress);
}
