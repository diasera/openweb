"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Bookmark } from "lucide-react";
import { Masonry } from "@/components/ui/masonry";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/section-header";
import { buttonClass } from "@/components/ui/button";
import { MediaCard } from "@/components/public/media-card";
import { PostRow } from "@/components/public/post-row";
import { MotionLink, listReveal } from "@/components/motion";
import { requestJson } from "@/lib/api/client";
import { forgetSaved, useSavedItems } from "@/lib/saved-items";
import type { MediaWithSlideCount } from "@/lib/media/slides";
import type { PublicPostCard } from "@/lib/data";

const noopSubscribe = () => () => {};

type SavedPayload = { pins: MediaWithSlideCount[]; posts: PublicPostCard[] };
type LoadState = { key: string; data: SavedPayload | null; error: string | null };

/** Isi koleksi Tersimpan milik perangkat ini (tanpa akun). */
export function SavedBrowser() {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const saved = useSavedItems();
  const pinIds = saved.filter((item) => item.kind === "pin").map((item) => item.id);
  const postIds = saved.filter((item) => item.kind === "post").map((item) => item.id);
  const query = `pins=${encodeURIComponent(pinIds.join(","))}&posts=${encodeURIComponent(postIds.join(","))}`;
  const empty = saved.length === 0;
  const [state, setState] = useState<LoadState | null>(null);

  useEffect(() => {
    if (empty) return;
    const controller = new AbortController();
    requestJson<Partial<SavedPayload>>(
      `/api/tersimpan?${query}`,
      { signal: controller.signal },
      "Koleksi tersimpan belum bisa dimuat.",
    )
      .then((payload) => {
        const data = { pins: payload.pins ?? [], posts: payload.posts ?? [] };
        setState({ key: query, data, error: null });
        // Item yang dihapus/tak lagi terbit ikut dilepas dari koleksi.
        const params = new URLSearchParams(query);
        const requested = (name: string) => (params.get(name) ?? "").split(",").filter(Boolean);
        const pins = new Set(data.pins.map((pin) => pin.id));
        const posts = new Set(data.posts.map((post) => post.id));
        forgetSaved("pin", requested("pins").filter((id) => !pins.has(id)));
        forgetSaved("post", requested("posts").filter((id) => !posts.has(id)));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          key: query,
          data: null,
          error: error instanceof Error ? error.message : "Koleksi tersimpan belum bisa dimuat.",
        });
      });
    return () => controller.abort();
  }, [empty, query]);

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

  const current = state?.key === query ? state : null;
  if (current?.error) {
    return <EmptyState title="Belum bisa dimuat" description={current.error} />;
  }
  if (!current?.data) {
    return (
      <Masonry aria-busy="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="bg-surface-2 animate-pulse rounded-pin"
            style={{ aspectRatio: index % 2 ? "3 / 4" : "1 / 1" }}
          />
        ))}
      </Masonry>
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
