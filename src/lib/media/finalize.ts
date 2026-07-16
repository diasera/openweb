import "server-only";

import { canAccess, getCurrentAdmin } from "@/lib/auth";
import { guardPublicInteraction } from "@/lib/api/public-mutation";
import { rateLimitResponse } from "@/lib/api/responses";
import { STORAGE_BUCKETS } from "@/lib/constants";
import {
  consumeRateLimit,
  RATE_LIMITS,
  requestRateLimitIdentity,
} from "@/lib/security/rate-limit";
import type { AdminRow, MediaType } from "@/lib/types/database";
import { finalizeStoredUpload } from "@/lib/uploads/finalize";
import {
  verifyUploadTicket,
  type UploadTicketPayload,
} from "@/lib/uploads/ticket";
import { removeMediaPathIfUnused } from "./upload";

type CreateFinalizeInput = {
  mode: "create";
  request: Request;
  token: string;
};

type EditFinalizeInput = {
  mode: "edit";
  request: Request;
  token: string;
  admin: AdminRow;
};

type GuardFailure = {
  ok: false;
  reason: "guard";
  response: Response;
};

type CommonFailure =
  | GuardFailure
  | { ok: false; reason: "invalid-ticket" }
  | { ok: false; reason: "invalid-descriptor" }
  | { ok: false; reason: "stored-invalid" | "stored-unavailable" };

type CreateFinalizeResult =
  | CommonFailure
  | { ok: false; reason: "invalid-admin-session" }
  | {
      ok: true;
      ticket: UploadTicketPayload;
      mediaType: MediaType;
      mimeType: string;
      admin: AdminRow | null;
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
    ticket?.kind === "media" && ticket.bucket === STORAGE_BUCKETS.media
  );
}

function rejectedToken(input: unknown): string | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const token = (input as Record<string, unknown>).ticket;
  return typeof token === "string" && token.length >= 1 && token.length <= 4096
    ? token
    : null;
}

async function cleanupTicket(ticket: UploadTicketPayload): Promise<void> {
  await removeMediaPathIfUnused(ticket.path);
}

async function adminRateLimitResponse(
  request: Request,
  adminId: string,
): Promise<Response | null> {
  const limited = await consumeRateLimit(
    RATE_LIMITS.adminUpload,
    requestRateLimitIdentity(request.headers, adminId),
  );
  return !limited.ok || !limited.allowed ? rateLimitResponse(limited) : null;
}

/** Admin aktif dengan akses media; route edit memeriksanya sebelum membaca body. */
export async function getMediaUploadAdmin(): Promise<AdminRow | null> {
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
  const token = rejectedToken(input);
  if (!token) return;
  const ticket = await verifyUploadTicket(token);
  if (!isMediaTicket(ticket)) return;
  if (
    context.mode === "edit" &&
    (ticket.source !== "admin" || ticket.adminId !== context.adminId)
  ) {
    return;
  }
  await cleanupTicket(ticket);
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
    const finalized = await finalizeStoredUpload<Response>({
      token: input.token,
      kind: "media",
      bucket: STORAGE_BUCKETS.media,
      acceptTicket: (ticket) =>
        ticket.source === "admin" &&
        ticket.adminId === input.admin.id &&
        canAccess(input.admin, "media"),
      acceptDescriptor: (policy) => policy.mediaType === "photo",
      cleanup: cleanupTicket,
      guard: {
        phase: "before-descriptor",
        run: () => adminRateLimitResponse(input.request, input.admin.id),
      },
    });
    if (!finalized.ok) {
      return finalized.reason === "guard"
        ? { ok: false, reason: "guard", response: finalized.guard }
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
    | { kind: "response"; response: Response };
  const createContext: {
    current: { admin: AdminRow | null; publicIp: string | null } | null;
  } = { current: null };
  const finalized = await finalizeStoredUpload<CreateGuardFailure>({
    token: input.token,
    kind: "media",
    bucket: STORAGE_BUCKETS.media,
    acceptDescriptor: (policy) => Boolean(policy.mediaType),
    cleanup: cleanupTicket,
    guard: {
      phase: "after-descriptor",
      run: async (ticket) => {
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
          if (limited) return { kind: "response", response: limited };
        } else {
          const guarded = await guardPublicInteraction(
            input.request,
            RATE_LIMITS.uploadFinalize,
            "Kamu tidak dapat mengunggah.",
          );
          if (!guarded.ok) {
            return { kind: "response", response: guarded.response };
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
  if (!finalized.policy.mediaType) {
    throw new Error("Tipe finalisasi media tidak valid.");
  }
  return {
    ok: true,
    ticket: finalized.ticket,
    mediaType: finalized.policy.mediaType as MediaType,
    mimeType: finalized.mimeType,
    admin: context.admin,
    publicIp: context.publicIp,
  };
}
