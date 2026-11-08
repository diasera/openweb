"use client";

import { throwIfAborted } from "@/lib/media-editor";

export interface PlayableMediaMetadata {
  duration: number | null;
  width: number | null;
  height: number | null;
}

const METADATA_TIMEOUT_MS = 12_000;

/** Probe decode aktual; `accept` dan MIME sendiri tidak menjamin codec dapat diputar. */
export async function probePlayableMedia(
  file: File,
  kind: "audio" | "video",
  signal?: AbortSignal,
): Promise<PlayableMediaMetadata> {
  throwIfAborted(signal);
  const element = document.createElement(kind);
  const url = URL.createObjectURL(file);
  element.preload = "metadata";
  if (kind === "video") {
    (element as HTMLVideoElement).playsInline = true;
  }

  try {
    return await new Promise<PlayableMediaMetadata>((resolve, reject) => {
      const cleanup = () => {
        window.clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        element.onloadedmetadata = null;
        element.onerror = null;
      };
      const onAbort = () => {
        cleanup();
        reject(new DOMException("Operasi dibatalkan.", "AbortError"));
      };
      const timer = window.setTimeout(() => {
        cleanup();
        reject(new Error("Metadata media terlalu lama untuk dibaca."));
      }, METADATA_TIMEOUT_MS);
      element.onloadedmetadata = () => {
        cleanup();
        const duration = Number.isFinite(element.duration)
          ? Math.max(0, element.duration)
          : null;
        if (kind === "video") {
          const video = element as HTMLVideoElement;
          if (video.videoWidth <= 0 || video.videoHeight <= 0) {
            reject(new Error("Dimensi video tidak valid."));
            return;
          }
          resolve({
            duration,
            width: video.videoWidth,
            height: video.videoHeight,
          });
          return;
        }
        resolve({ duration, width: null, height: null });
      };
      element.onerror = () => {
        cleanup();
        reject(
          new Error(
            "Codec media tidak dapat dibaca oleh browser ini atau file dilindungi DRM.",
          ),
        );
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) {
        onAbort();
        return;
      }
      element.src = url;
      element.load();
    });
  } finally {
    element.removeAttribute("src");
    element.load();
    URL.revokeObjectURL(url);
  }
}
