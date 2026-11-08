import "server-only";

export type JsonBodyResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: 400 | 413 | 415; error: string };

function requestOrigins(request: Request): Set<string> {
  const origins = new Set<string>();
  try {
    origins.add(new URL(request.url).origin);
  } catch {
    // URL Request dari Next normalnya selalu absolut.
  }

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost ?? request.headers.get("host")?.trim();
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  if (
    host &&
    /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host) &&
    (forwardedProtocol === "https" || forwardedProtocol === "http")
  ) {
    origins.add(`${forwardedProtocol}://${host}`);
  }
  return origins;
}

/** Tolak browser cross-site; klien non-browser tanpa Origin tetap didukung. */
export function validateMutationOrigin(request: Request): string | null {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return "Permintaan lintas situs tidak diizinkan.";
  }
  const origin = request.headers.get("origin");
  if (!origin) return null;
  if (origin === "null") return "Origin permintaan tidak valid.";
  try {
    return requestOrigins(request).has(new URL(origin).origin)
      ? null
      : "Origin permintaan tidak diizinkan.";
  } catch {
    return "Origin permintaan tidak valid.";
  }
}

/** Baca JSON secara streaming agar body besar dihentikan sebelum dialokasikan penuh. */
export async function readJsonBody<T = unknown>(
  request: Request,
  maxBytes = 16 * 1024,
): Promise<JsonBodyResult<T>> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return {
      ok: false,
      status: 415,
      error: "Content-Type harus application/json.",
    };
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return { ok: false, status: 413, error: "Body permintaan terlalu besar." };
  }
  if (!request.body) {
    return { ok: false, status: 400, error: "Body tidak valid." };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { ok: false, status: 413, error: "Body permintaan terlalu besar." };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, data: JSON.parse(text) as T };
  } catch {
    return { ok: false, status: 400, error: "Body tidak valid." };
  } finally {
    reader.releaseLock();
  }
}
