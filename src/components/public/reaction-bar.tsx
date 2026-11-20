"use client";

import { useState, useSyncExternalStore } from "react";
import { useToast } from "@/components/ui/toast";
import { postJson } from "@/lib/api/client";
import {
  isReactionKey,
  REACTION_ITEMS,
  type ReactionCounts,
  type ReactionKey,
  type ReactionTargetKind,
} from "@/lib/reactions";
import { cn } from "@/lib/utils/cn";
import {
  readStorageJson,
  STORAGE_KEYS,
  writeStorage,
} from "@/lib/utils/storage";

type ReactionStore = Record<string, ReactionKey[]>;
const REACTION_SYNC_EVENT = "openweb:reactions-updated";
const EMPTY_REACTIONS: ReactionKey[] = [];

function storeKey(kind: ReactionTargetKind, targetId: string) {
  return `${kind}:${targetId}`;
}

let cachedRaw = "";
let cachedParsed: ReactionStore = {};

function readReactionStore(): ReactionStore {
  if (typeof window === "undefined") return cachedParsed;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.contentReactions) ?? "";
    if (raw === cachedRaw) return cachedParsed;
    cachedRaw = raw;
    const parsed = readStorageJson(STORAGE_KEYS.contentReactions);
    const clean: ReactionStore = {};
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const [k, list] of Object.entries(parsed as Record<string, unknown>)) {
        if (Array.isArray(list)) {
          clean[k] = list.filter(
            (item): item is ReactionKey =>
              typeof item === "string" && isReactionKey(item),
          );
        }
      }
    }
    cachedParsed = clean;
    return cachedParsed;
  } catch {
    return cachedParsed;
  }
}

function writeReactionStore(next: ReactionStore) {
  writeStorage(STORAGE_KEYS.contentReactions, JSON.stringify(next));
  cachedRaw = "";
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(REACTION_SYNC_EVENT));
  }
}

function subscribeReactions(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === STORAGE_KEYS.contentReactions) {
      onStoreChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(REACTION_SYNC_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(REACTION_SYNC_EVENT, onStoreChange);
  };
}

/**
 * Baris reaksi emoji cepat terpusat untuk Pin Galeri & Artikel Blog.
 * - Tersembunyi otomatis bila `available === false` (sebelum migrasi DB dijalankan).
 * - Optimistic toggle dengan mikro-animasi pantul dan sinkron lintas tab.
 * - Berfungsi interaktif di Mode Demo tanpa memicu galat jaringan.
 */
export function ReactionBar({
  kind,
  targetId,
  initialCounts,
  available,
  demo = false,
  className,
}: {
  kind: ReactionTargetKind;
  targetId: string;
  initialCounts: ReactionCounts;
  available: boolean;
  demo?: boolean;
  className?: string;
}) {
  const { toast } = useToast();
  const key = storeKey(kind, targetId);
  const activeKeys = useSyncExternalStore(
    subscribeReactions,
    () => readReactionStore()[key] ?? EMPTY_REACTIONS,
    () => EMPTY_REACTIONS,
  );
  const [counts, setCounts] = useState<ReactionCounts>(initialCounts);
  const [busyKey, setBusyKey] = useState<ReactionKey | null>(null);
  const [poppingKey, setPoppingKey] = useState<ReactionKey | null>(null);

  if (!available) return null;

  async function toggle(emoji: ReactionKey) {
    if (busyKey === emoji) return;
    const store = readReactionStore();
    const currentList = store[key] ?? [];
    const wasActive = currentList.includes(emoji);
    const nextList = wasActive
      ? currentList.filter((item) => item !== emoji)
      : [...currentList, emoji];
    const prevCount = counts[emoji] ?? 0;
    const optimisticCount = Math.max(0, prevCount + (wasActive ? -1 : 1));

    // Pembaruan optimistik.
    writeReactionStore({ ...store, [key]: nextList });
    setCounts((prev) => ({ ...prev, [emoji]: optimisticCount }));
    setPoppingKey(emoji);
    setTimeout(() => {
      setPoppingKey((cur) => (cur === emoji ? null : cur));
    }, 340);

    if (demo) return;

    setBusyKey(emoji);
    try {
      const result = await postJson<{
        active: boolean;
        total: number;
      }>(
        "/api/reactions",
        { kind, id: targetId, emoji },
        "Gagal menyimpan reaksi.",
      );
      setCounts((prev) => ({ ...prev, [emoji]: result.total }));
      const latestStore = readReactionStore();
      const latestList = latestStore[key] ?? [];
      const synced = result.active
        ? latestList.includes(emoji)
          ? latestList
          : [...latestList, emoji]
        : latestList.filter((item) => item !== emoji);
      writeReactionStore({ ...latestStore, [key]: synced });
    } catch (error) {
      // Kembalikan ke kondisi sebelum klik.
      const rollbackStore = readReactionStore();
      writeReactionStore({ ...rollbackStore, [key]: currentList });
      setCounts((prev) => ({ ...prev, [emoji]: prevCount }));
      toast.error(
        error instanceof Error ? error.message : "Gagal menyimpan reaksi.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div
      role="group"
      aria-label="Reaksi cepat"
      className={cn("flex flex-wrap items-center gap-1.5", className)}
    >
      {REACTION_ITEMS.map((item) => {
        const active = activeKeys.includes(item.key);
        const count = counts[item.key] ?? 0;
        const popping = poppingKey === item.key;

        return (
          <button
            key={item.key}
            type="button"
            disabled={busyKey === item.key}
            aria-pressed={active}
            aria-label={`${item.label}${count > 0 ? `, ${count}` : ""}`}
            title={item.label}
            onClick={() => void toggle(item.key)}
            className={cn(
              "motion-pressable inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              active
                ? "border-primary/40 bg-primary/14 text-primary-readable"
                : "border-border bg-surface hover:bg-surface-2 text-muted hover:text-foreground",
              popping && "animate-reaction-pop",
            )}
          >
            <span aria-hidden="true" className="text-sm leading-none">
              {item.emoji}
            </span>
            {count > 0 && (
              <span className="tabular-nums leading-none">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
