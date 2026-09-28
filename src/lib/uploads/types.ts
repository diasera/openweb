export type DirectUploadKind = "media" | "music";

export interface UploadDescriptor {
  kind: DirectUploadKind;
  name: string;
  type: string;
  size: number;
}

export interface SignedUpload {
  bucket: string;
  path: string;
  signedUrl: string;
  uploadToken: string;
  ticket: string;
}

export interface DirectUploadProgress {
  sent: number;
  total: number;
  percentage: number;
}
