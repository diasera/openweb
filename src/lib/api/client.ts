/** Bentuk error minimum yang dipakai seluruh endpoint JSON aplikasi. */
type ApiErrorEnvelope = { error?: unknown };

/** Error HTTP dari endpoint JSON; status membantu UI memilih coba-ulang vs mulai ulang. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Kuota habis atau gangguan server: permintaan yang sama layak diulang. */
export function isRetryableApiError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 429 || error.status >= 500);
}

function errorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    const error = (data as ApiErrorEnvelope).error;
    if (typeof error === "string" && error.trim()) return error;
  }
  return fallback;
}

/**
 * Satu pembaca respons JSON untuk browser. Endpoint tetap menentukan bentuk
 * hasil sukses, sementara status gagal dan envelope `error` ditangani seragam.
 */
export async function requestJson<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  fallbackError: string,
): Promise<T> {
  const response = await fetch(input, init);
  const data = (await response.json().catch(() => ({}))) as unknown;
  if (!response.ok) {
    throw new ApiError(errorMessage(data, fallbackError), response.status);
  }
  return data as T;
}

export function postJson<T>(
  input: RequestInfo | URL,
  body: unknown,
  fallbackError: string,
  init: Omit<RequestInit, "body" | "method"> = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  return requestJson<T>(
    input,
    {
      ...init,
      method: "POST",
      headers,
      body: JSON.stringify(body),
    },
    fallbackError,
  );
}
