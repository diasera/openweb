"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { postJson } from "@/lib/api/client";

/**
 * Tombol suka pesan anonim. Optimistic + guard 1 like per browser (localStorage)
 * supaya angka tidak bisa dipompa dari satu perangkat. Balikan server dipakai
 * sebagai angka final bila tersedia.
 */
const KEY = "liked_messages";

function likedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}
function persist(set: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

export function MessageLike({ id, likes }: { id: string; likes: number }) {
  const [count, setCount] = useState(likes);
  const [liked, setLiked] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setLiked(likedIds().has(id));
  }, [id]);

  async function like() {
    if (liked || pending) return;
    setPending(true);
    // Optimistic
    setLiked(true);
    setCount((c) => c + 1);
    const set = likedIds();
    set.add(id);
    persist(set);

    try {
      const data = await postJson<{ likes?: number }>(
        "/api/pesan/like",
        { id },
        "Gagal menyukai pesan",
      );
      if (typeof data.likes === "number") setCount(data.likes);
    } catch {
      // Revert bila gagal
      setLiked(false);
      setCount((c) => Math.max(0, c - 1));
      const s = likedIds();
      s.delete(id);
      persist(s);
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
