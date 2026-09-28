import "server-only";

import { canAccess, getCurrentAdmin } from "@/lib/auth";
import { guardPublicInteraction } from "@/lib/api/public-mutation";
import { rateLimitResponse } from "@/lib/api/responses";
import { STORAGE_BUCKETS, UPLOAD_LIMITS } from "@/lib/constants";
import {
  consumeRateLimit,
  RATE_LIMITS,
  requestRateLimitIdentity,
} from "@/lib/security/rate-limit";
import type { AdminAccount, MediaType } from "@/lib/types/database";
import {
  finalizeStoredUpload,
  finalizeStoredUploads,
} from "@/lib/uploads/finalize";
import {
  verifyUploadTicket,
  type UploadTicketPayload,
} from "@/lib/uploads/ticket";
import { removeMediaPathIfUnused } from "./upload";

type CreateFinalizeInput = {
  mode: "create";
  request: Request;
  /** Satu tiket per item carousel, berurutan (item pertama = sampul). */
  tokens: readonly string[];
};

type EditFinalizeInput = {
  mode: "edit";
  request: Request;
  token: string;
  admin: AdminAccount;
};

type GuardFailure = {
  ok: false;
  reason: "guard";
  response: Response;
};

/** Respons guard beserta sifatnya: kuota/gangguan sementara tidak menghapus unggahan. */
type GuardResponse = { response: Response; retryable: boolean };

type CommonFailure =
  | GuardFailure
  | { ok: false; reason: "invalid-ticket" }
  | { ok: false; reason: "invalid-descriptor" }
  | { ok: false; reason: "stored-invalid" | "stored-unavailable" };

export interface FinalizedMediaItem {
  ticket: UploadTicketPayload;
  mediaType: MediaType;
  mimeType: string;
}

type CreateFinalizeResult =
  | CommonFailure
  | { ok: false; reason: "invalid-admin-session" }
  | {
      ok: true;
      /** Urutan sama dengan `tokens`. */
      items: FinalizedMediaItem[];
      source: UploadTicketPayload["source"];
      admin: AdminAccount | null;
      publicIp: string | null;
    };

type EditFinalizeResult =
  | CommonFailure
  | {
      ok: true;
      ticket: UploadTicketPayload;
      mimeType: string;
    };

type RejectedFinalizeContext =
  | { mode: "create" }
  | { mode: "edit"; adminId: string };

function isMediaTicket(
  ticket: UploadTicketPayload | null,
): ticket is UploadTicketPayload {
  return (
    ticket?.kind === "media" && ticket.bucket === STORAGE_BUCKETS.mediaInbox
  );
}

function validToken(value: unknown): string | null {
  return typeof value === "string" && value.length >= 1 && value.length <= 4096
    ? value
    : null;
}

/** Tiket dari body yang ditolak: bentuk carousel `items[]` maupun bentuk lama `ticket`. */
function rejectedTokens(input: unknown): string[] {
  if (!input || typeof input !== "object" || Array.isArray(input)) return [];
  const body = input as Record<string, unknown>;
  const items = Array.isArray(body.items)
    ? body.items.slice(0, UPLOAD_LIMITS.mediaPerPost)
    : [];
  const tokens = [
    body.ticket,
    ...items.map((item) =>
      item && typeof item === "object"
        ? (item as Record<string, unknown>).ticket
        : null,
    ),
  ].flatMap((value) => validToken(value) ?? []);
  return [...new Set(tokens)];
}

async function cleanupTicket(ticket: UploadTicketPayload): Promise<void> {
  await removeMediaPathIfUnused(ticket.path);
}

async function adminRateLimitResponse(
  request: Request,
  adminId: string,
): Promise<GuardResponse | null> {
  const limited = await consumeRateLimit(
    RATE_LIMITS.adminUpload,
    requestRateLimitIdentity(request.headers, adminId),
  );
  return !limited.ok || !limited.allowed
    ? { response: rateLimitResponse(limited), retryable: true }
    : null;
}

/** Admin aktif dengan akses media; route edit memeriksanya sebelum membaca body. */
export async function getMediaUploadAdmin(): Promise<AdminAccount | null> {
  const admin = await getCurrentAdmin();
  return admin && canAccess(admin, "media") ? admin : null;
}

/**
 * Bersihkan tiket yang masih dapat dipercaya ketika metadata route ditolak.
 * Tiket edit hanya boleh membersihkan objek milik admin yang sedang aktif.
 */
export async function cleanupRejectedMediaFinalization(
  input: unknown,
  context: RejectedFinalizeContext,
): Promise<void> {
  const tickets = await Promise.all(rejectedTokens(input).map(verifyUploadTicket));
  await Promise.all(
    tickets.map(async (ticket) => {
      if (!isMediaTicket(ticket)) return;
      if (
        context.mode === "edit" &&
        (ticket.source !== "admin" || ticket.adminId !== context.adminId)
      ) {
        return;
      }
      await cleanupTicket(ticket);
    }),
  );
}

export function finalizeMediaUpload(
  input: CreateFinalizeInput,
): Promise<CreateFinalizeResult>;
export function finalizeMediaUpload(
  input: EditFinalizeInput,
): Promise<EditFinalizeResult>;

/**
 * Validasi keamanan finalisasi direct-upload. Metadata bisnis dan mutasi record
 * tetap dimiliki route pemanggil.
 */
export async function finalizeMediaUpload(
  input: CreateFinalizeInput | EditFinalizeInput,
): Promise<CreateFinalizeResult | EditFinalizeResult> {
  if (input.mode === "edit") {
    const finalized = await finalizeStoredUpload<GuardResponse>({
      token: input.token,
      kind: "media",
      bucket: STORAGE_BUCKETS.mediaInbox,
      acceptTicket: (ticket) =>
        ticket.source === "admin" &&
        ticket.adminId === input.admin.id &&
        canAccess(input.admin, "media"),
      acceptDescriptor: (policy) => policy.mediaType === "photo",
      cleanup: cleanupTicket,
      guard: {
        phase: "before-descriptor",
        run: () => adminRateLimitResponse(input.request, input.admin.id),
        retainOnFailure: (failure) => failure.retryable,
      },
    });
    if (!finalized.ok) {
      return finalized.reason === "guard"
        ? { ok: false, reason: "guard", response: finalized.guard.response }
        : finalized;
    }
    return {
      ok: true,
      ticket: finalized.ticket,
      mimeType: finalized.mimeType,
    };
  }

  type CreateGuardFailure =
    | { kind: "invalid-admin-session" }
    | ({ kind: "response" } & GuardResponse);
  const createContext: {
    current: { admin: AdminAccount | null; publicIp: string | null } | null;
  } = { current: null };
  const finalized = await finalizeStoredUploads<CreateGuardFailure>({
    tokens: input.tokens,
    kind: "media",
    bucket: STORAGE_BUCKETS.mediaInbox,
    // Satu pin = satu pemilik: tiket publik dan admin tidak boleh dicampur.
    acceptBatch: (tickets) =>
      tickets.length <= UPLOAD_LIMITS.mediaPerPost &&
      tickets.every(
        (ticket) =>
          ticket.source === tickets[0].source &&
          ticket.adminId === tickets[0].adminId,
      ),
    acceptDescriptor: (policy) => Boolean(policy.mediaType),
    cleanup: cleanupTicket,
    guard: {
      phase: "after-descriptor",
      retainOnFailure: (failure) =>
        failure.kind === "response" && failure.retryable,
      // Kuota publik/admin dihitung sekali per pin, bukan per item carousel.
      run: async ([ticket]) => {
        const admin = await getCurrentAdmin();
        let publicIp: string | null = null;
        if (ticket.source === "admin") {
          if (
            !admin ||
            admin.id !== ticket.adminId ||
            !canAccess(admin, "media")
          ) {
            return { kind: "invalid-admin-session" };
          }
          const limited = await adminRateLimitResponse(input.request, admin.id);
          if (limited) return { kind: "response", ...limited };
        } else {
          const guarded = await guardPublicInteraction(
            input.request,
            RATE_LIMITS.uploadFinalize,
            "Kamu tidak dapat mengunggah.",
          );
          if (!guarded.ok) {
            return {
              kind: "response",
              response: guarded.response,
              retryable: guarded.retryable,
            };
          }
          publicIp = guarded.access.ip;
        }
        createContext.current = { admin, publicIp };
        return null;
      },
    },
  });
  if (!finalized.ok) {
    if (finalized.reason !== "guard") return finalized;
    return finalized.guard.kind === "invalid-admin-session"
      ? { ok: false, reason: "invalid-admin-session" }
      : { ok: false, reason: "guard", response: finalized.guard.response };
  }
  const context = createContext.current;
  if (!context) {
    throw new Error("Konteks finalisasi media tidak valid.");
  }
  const items = finalized.uploads.map((upload) => {
    if (!upload.policy.mediaType) {
      throw new Error("Tipe finalisasi media tidak valid.");
    }
    return {
      ticket: upload.ticket,
      mediaType: upload.policy.mediaType as MediaType,
      mimeType: upload.mimeType,
    };
  });
  return {
    ok: true,
    items,
    source: items[0].ticket.source,
    admin: context.admin,
    publicIp: context.publicIp,
  };
}
