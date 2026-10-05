"use client";

import { useState, useSyncExternalStore } from "react";
import { Heart } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import { postJson } from "@/lib/api/client";
import {
  readStorageJson,
  STORAGE_KEYS,
  writeStorage,
} from "@/lib/utils/storage";

/**
 * Tombol suka pesan anonim. Optimistic + guard 1 like per browser (storage)
 * supaya angka tidak bisa dipompa dari satu perangkat; server tetap menjadi
 * penegak dedup per pengunjung dan angkanya dipakai sebagai nilai final.
 */
let likedCache: ReadonlySet<string> | null = null;
const listeners = new Set<() => void>();

function likedIds(): ReadonlySet<string> {
  if (!likedCache) {
    const stored = readStorageJson(STORAGE_KEYS.likedMessages);
    likedCache = new Set(
      Array.isArray(stored)
        ? stored.filter((id): id is string => typeof id === "string")
        : [],
    );
  }
  return likedCache;
}

function setLiked(id: string, liked: boolean) {
  const next = new Set(likedIds());
  if (liked) next.add(id);
  else next.delete(id);
  likedCache = next;
  writeStorage(STORAGE_KEYS.likedMessages, JSON.stringify([...next]));
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== STORAGE_KEYS.likedMessages) return;
  likedCache = null;
  for (const listener of listeners) listener();
}

/** Satu langganan untuk semua kartu pesan; tab lain ikut tersinkron. */
function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function MessageLike({ id, likes }: { id: string; likes: number }) {
  const { toast } = useToast();
  const liked = useSyncExternalStore(
    subscribe,
    () => likedIds().has(id),
    () => false,
  );
  const [count, setCount] = useState(likes);
  const [pending, setPending] = useState(false);

  async function like() {
    if (liked || pending) return;
    setPending(true);
    setLiked(id, true);
    setCount((c) => c + 1);

    try {
      const data = await postJson<{ likes?: number }>(
        "/api/pesan/like",
        { id },
        "Gagal menyukai pesan",
      );
      if (typeof data.likes === "number") setCount(data.likes);
    } catch (error) {
      setLiked(id, false);
      setCount((c) => Math.max(0, c - 1));
      toast.error(error instanceof Error ? error.message : "Gagal menyukai pesan");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={like}
      disabled={liked || pending}
      aria-label={`${liked ? "Disukai" : "Suka"}, ${count} suka`}
      aria-pressed={liked}
      className={cn(
        "inline-flex items-center gap-1 transition active:scale-90 disabled:cursor-default",
        liked ? "text-primary-readable" : "hover:text-primary-readable",
      )}
    >
      <Heart
        className={cn(
          "h-3.5 w-3.5",
          liked && "animate-symbol-bounce fill-current",
        )}
      />
      {count}
    </button>
  );
}
