/// <reference lib="webworker" />

import { heicTo, isHeic } from "heic-to/next";

interface ConvertRequest {
  file: File;
  quality: number;
}

interface ConvertResponse {
  blob?: Blob;
  error?: string;
}

self.onmessage = async (event: MessageEvent<ConvertRequest>) => {
  let response: ConvertResponse;
  try {
    if (!(await isHeic(event.data.file))) {
      throw new Error("Isi file tidak cocok dengan format HEIC/HEIF.");
    }
    response = {
      blob: await heicTo({
        blob: event.data.file,
        type: "image/jpeg",
        quality: event.data.quality,
      }),
    };
  } catch (cause) {
    response = {
      error:
        cause instanceof Error
          ? cause.message
          : "HEIC/HEIF gagal dikonversi.",
    };
  }
  self.postMessage(response);
};

export {};

