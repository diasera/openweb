export const CALLOUT_TONES = ["info", "tips", "penting", "peringatan"] as const;

export type CalloutTone = (typeof CALLOUT_TONES)[number];

export const CALLOUT_LABELS: Record<CalloutTone, string> = {
  info: "Catatan",
  tips: "Tips",
  penting: "Penting",
  peringatan: "Perhatian",
};

const TONE_SET: ReadonlySet<string> = new Set(CALLOUT_TONES);

export function isCalloutTone(value: unknown): value is CalloutTone {
  return typeof value === "string" && TONE_SET.has(value);
}

export function normalizeCalloutTone(value: unknown): CalloutTone {
  return isCalloutTone(value) ? value : "info";
}
