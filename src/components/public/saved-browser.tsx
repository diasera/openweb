"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark } from "lucide-react";
import { Masonry } from "@/components/ui/masonry";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { SkeletonMasonry, SkeletonScreen } from "@/components/ui/skeleton";
import { buttonClass } from "@/components/ui/button";
import { MediaCard } from "@/components/public/media-card";
import { PostRow } from "@/components/public/post-row";
import { MotionLink, listReveal } from "@/components/motion";
import { requestJson } from "@/lib/api/client";
import { SAVED_ITEM_LIMITS } from "@/lib/constants";
import { useHydrated } from "@/lib/hooks/use-now";
import { forgetSaved, useSavedItems } from "@/lib/saved-items";
import type { MediaWithSlideCount } from "@/lib/media/slides";
import type { PublicPostCard } from "@/lib/data";

type SavedPayload = { pins: MediaWithSlideCount[]; posts: PublicPostCard[] };
type LoadState = { key: string; data: SavedPayload | null; error: string | null };

const LOAD_ERROR = "Koleksi tersimpan belum bisa dimuat.";

function collectionKey(pinIds: readonly string[], postIds: readonly string[]) {
  return `${pinIds.join(",")}|${postIds.join(",")}`;
}

/**
 * API membatasi id per permintaan agar URL tetap pendek, jadi koleksi besar
 * diminta per batch. Tanpa ini, item di luar batch pertama dianggap hilang
 * lalu terhapus permanen dari koleksi.
 */
async function fetchSavedCollection(
  pinIds: readonly string[],
  postIds: readonly string[],
  signal: AbortSignal,
): Promise<SavedPayload> {
  const size = SAVED_ITEM_LIMITS.idsPerRequest;
  const batches = Math.max(
    Math.ceil(pinIds.length / size),
    Math.ceil(postIds.length / size),
  );
  const responses = await Promise.all(
    Array.from({ length: batches }, (_, batch) => {
      const query = new URLSearchParams({
        pins: pinIds.slice(batch * size, (batch + 1) * size).join(","),
        posts: postIds.slice(batch * size, (batch + 1) * size).join(","),
      });
      return requestJson<Partial<SavedPayload>>(
        `/api/tersimpan?${query}`,
        { signal },
        LOAD_ERROR,
      );
    }),
  );
  // Ketiadaan item di respons berarti item dilepas PERMANEN dari koleksi, jadi
  // respons wajib utuh. requestJson mengubah body 200 yang gagal dibaca
  // (koneksi putus di tengah, halaman non-JSON dari perantara) menjadi `{}`.
  for (const payload of responses) {
    if (!Array.isArray(payload.pins) || !Array.isArray(payload.posts)) {
      throw new Error(LOAD_ERROR);
    }
  }
  return {
    pins: responses.flatMap((payload) => payload.pins ?? []),
    posts: responses.flatMap((payload) => payload.posts ?? []),
  };
}

/** Isi koleksi Tersimpan milik perangkat ini (tanpa akun). */
export function SavedBrowser() {
  const hydrated = useHydrated();
  const saved = useSavedItems();
  const pinIds = useMemo(
    () => saved.filter((item) => item.kind === "pin").map((item) => item.id),
    [saved],
  );
  const postIds = useMemo(
    () => saved.filter((item) => item.kind === "post").map((item) => item.id),
    [saved],
  );
  const key = collectionKey(pinIds, postIds);
  const empty = saved.length === 0;
  const [state, setState] = useState<LoadState | null>(null);
  // Koleksi yang datanya sudah lengkap (termasuk setelah item hilang dilepas)
  // tidak perlu diminta ulang hanya karena daftarnya menyusut.
  const loadedKey = useRef<string | null>(null);

  useEffect(() => {
    if (empty || loadedKey.current === key) return;
    const controller = new AbortController();
    fetchSavedCollection(pinIds, postIds, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        // Item yang dihapus/tak lagi terbit ikut dilepas dari koleksi.
        const pins = new Set(data.pins.map((pin) => pin.id));
        const posts = new Set(data.posts.map((post) => post.id));
        const keptKey = collectionKey(
          pinIds.filter((id) => pins.has(id)),
          postIds.filter((id) => posts.has(id)),
        );
        loadedKey.current = keptKey;
        setState({ key: keptKey, data, error: null });
        forgetSaved("pin", pinIds.filter((id) => !pins.has(id)));
        forgetSaved("post", postIds.filter((id) => !posts.has(id)));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          key,
          data: null,
          error: error instanceof Error ? error.message : LOAD_ERROR,
        });
      });
    return () => controller.abort();
  }, [empty, key, pinIds, postIds]);

  if (hydrated && empty) {
    return (
      <EmptyState
        icon={<Bookmark className="h-8 w-8" />}
        title="Belum ada yang tersimpan"
        description="Ketuk Simpan di pin atau artikel mana pun; koleksinya tersimpan di perangkat ini."
        action={
          <MotionLink href="/galeri" className={buttonClass({ size: "sm" })}>
            Jelajahi galeri
          </MotionLink>
        }
      />
    );
  }

  const current = state?.key === key ? state : null;
  if (current?.error) {
    return <EmptyState title="Belum bisa dimuat" description={current.error} />;
  }
  if (!current?.data) {
    return (
      <SkeletonScreen label="Memuat koleksi tersimpan">
        <SkeletonMasonry count={6} />
      </SkeletonScreen>
    );
  }

  const { pins, posts } = current.data;
  return (
    <div className="space-y-7">
      {pins.length > 0 && (
        <section>
          <SectionHeader title="Pin" subtitle={`${pins.length} pin tersimpan`} />
          <Masonry>
            {pins.map((pin, index) => (
              <div key={pin.id} {...listReveal(index)}>
                <MediaCard media={pin} showMeta />
              </div>
            ))}
          </Masonry>
        </section>
      )}
      {posts.length > 0 && (
        <section>
          <SectionHeader title="Artikel" subtitle={`${posts.length} artikel tersimpan`} />
          <div className="space-y-2">
            {posts.map((post) => (
              <PostRow key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
