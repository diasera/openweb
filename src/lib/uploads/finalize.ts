import "server-only";

import { verifyStoredObject } from "@/lib/storage";
import { validateUploadDescriptor, type UploadPolicyResult } from "./policy";
import {
  verifyUploadTicket,
  type UploadTicketPayload,
} from "./ticket";
import type { DirectUploadKind } from "./types";

type AcceptedPolicy = Extract<UploadPolicyResult, { ok: true }>;

type GuardPhase = "before-descriptor" | "after-descriptor";

type FinalizationGuard<T> = {
  phase: GuardPhase;
  run: (
    ticket: UploadTicketPayload,
    policy: UploadPolicyResult | null,
  ) => Promise<T | null>;
  /** Kegagalan sementara (kuota/gangguan) menyimpan objek agar finalisasi bisa diulang. */
  retainOnFailure?: (failure: T) => boolean;
};

/** Guard batch dijalankan SEKALI per kiriman, bukan per file. */
type BatchFinalizationGuard<T> = {
  phase: GuardPhase;
  run: (
    tickets: UploadTicketPayload[],
    policies: AcceptedPolicy[] | null,
  ) => Promise<T | null>;
  retainOnFailure?: (failure: T) => boolean;
};

interface FinalizationRules {
  kind: DirectUploadKind;
  bucket: string;
  acceptTicket?: (ticket: UploadTicketPayload) => boolean;
  acceptDescriptor?: (policy: AcceptedPolicy) => boolean;
  cleanup: (ticket: UploadTicketPayload) => Promise<void>;
}

interface StoredUploadFinalizationInput<TGuardFailure> extends FinalizationRules {
  token: string;
  guard?: FinalizationGuard<TGuardFailure>;
}

interface StoredUploadsFinalizationInput<TGuardFailure> extends FinalizationRules {
  tokens: readonly string[];
  /** Aturan lintas tiket, mis. seluruh file satu kiriman wajib satu pemilik. */
  acceptBatch?: (tickets: UploadTicketPayload[]) => boolean;
  guard?: BatchFinalizationGuard<TGuardFailure>;
}

type FinalizationFailure<TGuardFailure> =
  | { ok: false; reason: "invalid-ticket" }
  | {
      ok: false;
      reason: "invalid-descriptor";
      policy: UploadPolicyResult;
    }
  | { ok: false; reason: "stored-invalid" | "stored-unavailable" }
  | { ok: false; reason: "guard"; guard: TGuardFailure };

export interface FinalizedStoredUpload {
  ticket: UploadTicketPayload;
  policy: AcceptedPolicy;
  mimeType: string;
}

export type StoredUploadFinalizationResult<TGuardFailure> =
  | FinalizationFailure<TGuardFailure>
  | ({ ok: true } & FinalizedStoredUpload);

export type StoredUploadsFinalizationResult<TGuardFailure> =
  | FinalizationFailure<TGuardFailure>
  | { ok: true; uploads: FinalizedStoredUpload[] };

/**
 * Otak finalisasi direct-upload: tiket, kepemilikan, policy, verifikasi byte,
 * serta cleanup objek invalid. Satu kiriman boleh berisi beberapa file
 * (carousel); kiriman diterima atau ditolak utuh sehingga tidak pernah ada
 * pin setengah jadi. Callback guard mempertahankan urutan keamanan khusus
 * route tanpa menggandakan lifecycle Storage.
 */
export async function finalizeStoredUploads<TGuardFailure = never>(
  input: StoredUploadsFinalizationInput<TGuardFailure>,
): Promise<StoredUploadsFinalizationResult<TGuardFailure>> {
  const verified = await Promise.all(input.tokens.map(verifyUploadTicket));
  const tickets = verified.filter(
    (ticket): ticket is UploadTicketPayload =>
      ticket !== null &&
      ticket.kind === input.kind &&
      ticket.bucket === input.bucket &&
      (!input.acceptTicket || input.acceptTicket(ticket)),
  );
  // Tiket yang lolos verifikasi milik pengirim ini; saat kiriman ditolak utuh,
  // objeknya ikut dibersihkan (cleanup tetap memeriksa referensi database).
  const cleanupAll = async () => {
    await Promise.all(tickets.map((ticket) => input.cleanup(ticket)));
  };
  const guardFailure = async (
    guard: BatchFinalizationGuard<TGuardFailure>,
    failure: TGuardFailure,
  ): Promise<FinalizationFailure<TGuardFailure>> => {
    if (!guard.retainOnFailure?.(failure)) await cleanupAll();
    return { ok: false, reason: "guard", guard: failure };
  };

  if (
    tickets.length === 0 ||
    tickets.length !== input.tokens.length ||
    new Set(tickets.map((ticket) => ticket.path)).size !== tickets.length ||
    (input.acceptBatch && !input.acceptBatch(tickets))
  ) {
    await cleanupAll();
    return { ok: false, reason: "invalid-ticket" };
  }

  if (input.guard?.phase === "before-descriptor") {
    const failure = await input.guard.run(tickets, null);
    if (failure !== null) return guardFailure(input.guard, failure);
  }

  const policies: AcceptedPolicy[] = [];
  for (const ticket of tickets) {
    const policy = validateUploadDescriptor({
      kind: input.kind,
      name: ticket.path,
      type: ticket.mime,
      size: ticket.size,
    });
    if (!policy.ok || (input.acceptDescriptor && !input.acceptDescriptor(policy))) {
      await cleanupAll();
      return { ok: false, reason: "invalid-descriptor", policy };
    }
    policies.push(policy);
  }

  if (input.guard?.phase === "after-descriptor") {
    const failure = await input.guard.run(tickets, policies);
    if (failure !== null) return guardFailure(input.guard, failure);
  }

  const stored = await Promise.all(
    tickets.map((ticket) =>
      verifyStoredObject(ticket.bucket, ticket.path, ticket.size, ticket.mime),
    ),
  );
  if (stored.some((result) => !result.ok && result.reason === "invalid")) {
    await cleanupAll();
    return { ok: false, reason: "stored-invalid" };
  }
  const uploads: FinalizedStoredUpload[] = [];
  for (const [index, result] of stored.entries()) {
    if (!result.ok) return { ok: false, reason: "stored-unavailable" };
    uploads.push({
      ticket: tickets[index],
      policy: policies[index],
      mimeType: result.mimeType,
    });
  }
  return { ok: true, uploads };
}

/** Finalisasi satu file (musik, edit foto) memakai otak batch yang sama. */
export async function finalizeStoredUpload<TGuardFailure = never>(
  input: StoredUploadFinalizationInput<TGuardFailure>,
): Promise<StoredUploadFinalizationResult<TGuardFailure>> {
  const { token, guard, ...rules } = input;
  const result = await finalizeStoredUploads<TGuardFailure>({
    ...rules,
    tokens: [token],
    guard: guard && {
      phase: guard.phase,
      retainOnFailure: guard.retainOnFailure,
      run: ([ticket], policies) => guard.run(ticket, policies?.[0] ?? null),
    },
  });
  if (!result.ok) return result;
  const [upload] = result.uploads;
  return { ok: true, ...upload };
}
