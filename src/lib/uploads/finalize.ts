import "server-only";

import { verifyStoredObject } from "@/lib/storage";
import { validateUploadDescriptor, type UploadPolicyResult } from "./policy";
import {
  verifyUploadTicket,
  type UploadTicketPayload,
} from "./ticket";
import type { DirectUploadKind } from "./types";

type FinalizationGuard<T> = {
  phase: "before-descriptor" | "after-descriptor";
  run: (
    ticket: UploadTicketPayload,
    policy: UploadPolicyResult | null,
  ) => Promise<T | null>;
};

interface StoredUploadFinalizationInput<TGuardFailure> {
  token: string;
  kind: DirectUploadKind;
  bucket: string;
  acceptTicket?: (ticket: UploadTicketPayload) => boolean;
  acceptDescriptor?: (policy: Extract<UploadPolicyResult, { ok: true }>) => boolean;
  cleanup: (ticket: UploadTicketPayload) => Promise<void>;
  guard?: FinalizationGuard<TGuardFailure>;
}

export type StoredUploadFinalizationResult<TGuardFailure> =
  | { ok: false; reason: "invalid-ticket" }
  | {
      ok: false;
      reason: "invalid-descriptor";
      policy: UploadPolicyResult;
    }
  | { ok: false; reason: "stored-invalid" | "stored-unavailable" }
  | { ok: false; reason: "guard"; guard: TGuardFailure }
  | {
      ok: true;
      ticket: UploadTicketPayload;
      policy: Extract<UploadPolicyResult, { ok: true }>;
      mimeType: string;
    };

/**
 * Otak finalisasi direct-upload: tiket, kepemilikan, policy, verifikasi byte,
 * serta cleanup objek invalid. Callback guard mempertahankan urutan keamanan
 * khusus route tanpa menggandakan lifecycle Storage.
 */
export async function finalizeStoredUpload<TGuardFailure = never>(
  input: StoredUploadFinalizationInput<TGuardFailure>,
): Promise<StoredUploadFinalizationResult<TGuardFailure>> {
  const ticket = await verifyUploadTicket(input.token);
  if (
    !ticket ||
    ticket.kind !== input.kind ||
    ticket.bucket !== input.bucket ||
    (input.acceptTicket && !input.acceptTicket(ticket))
  ) {
    return { ok: false, reason: "invalid-ticket" };
  }

  if (input.guard?.phase === "before-descriptor") {
    const guard = await input.guard.run(ticket, null);
    if (guard !== null) {
      await input.cleanup(ticket);
      return { ok: false, reason: "guard", guard };
    }
  }

  const policy = validateUploadDescriptor({
    kind: input.kind,
    name: ticket.path,
    type: ticket.mime,
    size: ticket.size,
  });
  if (!policy.ok || (input.acceptDescriptor && !input.acceptDescriptor(policy))) {
    await input.cleanup(ticket);
    return { ok: false, reason: "invalid-descriptor", policy };
  }

  if (input.guard?.phase === "after-descriptor") {
    const guard = await input.guard.run(ticket, policy);
    if (guard !== null) {
      await input.cleanup(ticket);
      return { ok: false, reason: "guard", guard };
    }
  }

  const stored = await verifyStoredObject(
    ticket.bucket,
    ticket.path,
    ticket.size,
    ticket.mime,
  );
  if (!stored.ok) {
    if (stored.reason === "invalid") await input.cleanup(ticket);
    return {
      ok: false,
      reason:
        stored.reason === "invalid" ? "stored-invalid" : "stored-unavailable",
    };
  }

  return {
    ok: true,
    ticket,
    policy,
    mimeType: stored.mimeType,
  };
}
