import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { getAuthSecretKey } from "@/lib/auth/session";
import type { DirectUploadKind } from "./types";

const ISSUER = "webkelas-upload";
const AUDIENCE = "upload-finalize";

export interface UploadTicketPayload {
  kind: DirectUploadKind;
  bucket: string;
  path: string;
  mime: string;
  size: number;
  source: "public" | "admin";
  adminId?: string;
}

export async function signUploadTicket(
  payload: UploadTicketPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(getAuthSecretKey());
}

export async function verifyUploadTicket(
  token: string,
): Promise<UploadTicketPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecretKey(), {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (
      (payload.kind !== "media" && payload.kind !== "music") ||
      typeof payload.bucket !== "string" ||
      typeof payload.path !== "string" ||
      typeof payload.mime !== "string" ||
      typeof payload.size !== "number" ||
      (payload.source !== "public" && payload.source !== "admin")
    ) {
      return null;
    }
    return {
      kind: payload.kind,
      bucket: payload.bucket,
      path: payload.path,
      mime: payload.mime,
      size: payload.size,
      source: payload.source,
      ...(typeof payload.adminId === "string"
        ? { adminId: payload.adminId }
        : {}),
    };
  } catch {
    return null;
  }
}
