interface LoadImageElementOptions {
  signal?: AbortSignal;
  errorMessage: string;
}

/**
 * Loader elemen gambar browser yang menangani cache, abort, dan pelepasan
 * handler dari satu tempat. Kepemilikan Object URL tetap pada pemanggil.
 */
export function loadImageElement(
  source: string,
  { signal, errorMessage }: LoadImageElementOptions,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";

    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener("abort", onAbort);
    };
    const fail = (error: Error) => {
      cleanup();
      image.src = "";
      reject(error);
    };
    const onAbort = () => {
      fail(new DOMException("Operasi dibatalkan.", "AbortError"));
    };

    image.onload = () => {
      cleanup();
      resolve(image);
    };
    image.onerror = () => fail(new Error(errorMessage));
    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) {
      onAbort();
      return;
    }
    image.src = source;
  });
}
