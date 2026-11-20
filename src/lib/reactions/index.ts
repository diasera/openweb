import { z } from "zod";

/** Daftar kunci reaksi yang diizinkan (sinkron dengan CHECK constraint schema.sql). */
export const REACTION_KEYS = ["heart", "fire", "clap", "laugh", "wow"] as const;

export type ReactionKey = (typeof REACTION_KEYS)[number];
export type ReactionTargetKind = "media" | "blog";
export type ReactionCounts = Record<ReactionKey, number>;

export const REACTION_ITEMS: ReadonlyArray<{
  key: ReactionKey;
  emoji: string;
  label: string;
}> = [
  { key: "heart", emoji: "❤️", label: "Suka" },
  { key: "fire", emoji: "🔥", label: "Keren" },
  { key: "clap", emoji: "👏", label: "Apresiasi" },
  { key: "laugh", emoji: "😂", label: "Seru" },
  { key: "wow", emoji: "🤩", label: "Kagum" },
];

export function emptyReactionCounts(): ReactionCounts {
  return { heart: 0, fire: 0, clap: 0, laugh: 0, wow: 0 };
}

export function isReactionKey(value: string): value is ReactionKey {
  return (REACTION_KEYS as readonly string[]).includes(value);
}

export const reactionToggleSchema = z.object({
  kind: z.enum(["media", "blog"]),
  id: z.uuid(),
  emoji: z.enum(REACTION_KEYS),
});
