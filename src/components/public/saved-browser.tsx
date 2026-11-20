"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  Bookmark,
  Download,
  Play,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Masonry } from "@/components/ui/masonry";
import { EmptyState } from "@/components/ui/empty-state";
import { MediaLightbox } from "@/components/ui/media-lightbox";
import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import { SectionHeader } from "@/components/ui/section-header";
import { Segmented } from "@/components/ui/segmented";
import { SkeletonMasonry, SkeletonScreen } from "@/components/ui/skeleton";
import { Button, buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { MediaCard } from "@/components/public/media-card";
import {
  MediaGridControls,
  type MediaGridDensity,
} from "@/components/public/media-grid-controls";
import { PostRow } from "@/components/public/post-row";
import { MotionLink, listReveal } from "@/components/motion";
import { requestJson } from "@/lib/api/client";
import { SAVED_ITEM_LIMITS } from "@/lib/constants";
import { useHydrated } from "@/lib/hooks/use-now";
import {
  buildSavedExportJson,
  clearSaved,
  forgetSaved,
  useSavedItems,
} from "@/lib/hooks/use-saved-items";
import type { MediaSlide, MediaWithSlideCount } from "@/lib/media/slides";
import type { PublicPostCard } from "@/lib/data";

type SavedPayload = { pins: MediaWithSlideCount[]; posts: PublicPostCard[] };
type LoadState = {
  key: string;
  data: SavedPayload | null;
  error: string | null;
};
type SavedTab = "all" | "pin" | "post";
type SavedSort = "newest" | "oldest";

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

/**
 * Koleksi Tersimpan Pro milik perangkat ini (tanpa akun): pencarian, filter
 * tab Pin/Artikel, sortir tanggal simpan, slideshow lightbox pin, ekspor JSON,
 * kosongkan dengan konfirmasi Modal, serta tombol coba lagi bila jaringan gagal.
 */
export function SavedBrowser() {
  const { toast } = useToast();
  const hydrated = useHydrated();
  const saved = useSavedItems();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SavedTab>("all");
  const [sort, setSort] = useState<SavedSort>("newest");
  const [density, setDensity] = useState<MediaGridDensity>("comfortable");
  const [reloadTick, setReloadTick] = useState(0);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const pinIds = useMemo(
    () => saved.filter((item) => item.kind === "pin").map((item) => item.id),
    [saved],
  );
  const postIds = useMemo(
    () => saved.filter((item) => item.kind === "post").map((item) => item.id),
    [saved],
  );
  const savedAtMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of saved) map.set(`${item.kind}:${item.id}`, item.savedAt);
    return map;
  }, [saved]);

  const key = collectionKey(pinIds, postIds);
  const empty = saved.length === 0;
  const [state, setState] = useState<LoadState | null>(null);
  const loadedKey = useRef<string | null>(null);

  useEffect(() => {
    if (empty) {
      loadedKey.current = null;
      return;
    }
    if (loadedKey.current === key && reloadTick === 0) return;
    const controller = new AbortController();
    fetchSavedCollection(pinIds, postIds, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        const pins = new Set(data.pins.map((pin) => pin.id));
        const posts = new Set(data.posts.map((post) => post.id));
        const keptKey = collectionKey(
          pinIds.filter((id) => pins.has(id)),
          postIds.filter((id) => posts.has(id)),
        );
        loadedKey.current = keptKey;
        setState({ key: keptKey, data, error: null });
        forgetSaved(
          "pin",
          pinIds.filter((id) => !pins.has(id)),
        );
        forgetSaved(
          "post",
          postIds.filter((id) => !posts.has(id)),
        );
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
  }, [empty, key, pinIds, postIds, reloadTick]);

  const current = state?.key === key ? state : null;
  const rawPins = useMemo(() => current?.data?.pins ?? [], [current?.data?.pins]);
  const rawPosts = useMemo(
    () => current?.data?.posts ?? [],
    [current?.data?.posts],
  );

  const filteredPins = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const list = rawPins.filter(
      (pin) =>
        !q ||
        `${pin.title ?? ""} ${pin.caption ?? ""} ${pin.category ?? ""} ${pin.uploader_name ?? ""}`
          .toLocaleLowerCase()
          .includes(q),
    );
    return [...list].sort((a, b) => {
      const ta = savedAtMap.get(`pin:${a.id}`) ?? 0;
      const tb = savedAtMap.get(`pin:${b.id}`) ?? 0;
      return sort === "newest" ? tb - ta : ta - tb;
    });
  }, [query, rawPins, savedAtMap, sort]);

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const list = rawPosts.filter(
      (post) =>
        !q ||
        `${post.title} ${post.excerpt ?? ""} ${post.category ?? ""} ${post.author_name ?? ""}`
          .toLocaleLowerCase()
          .includes(q),
    );
    return [...list].sort((a, b) => {
      const ta = savedAtMap.get(`post:${a.id}`) ?? 0;
      const tb = savedAtMap.get(`post:${b.id}`) ?? 0;
      return sort === "newest" ? tb - ta : ta - tb;
    });
  }, [query, rawPosts, savedAtMap, sort]);

  const pinSlides = useMemo<MediaSlide[]>(
    () =>
      filteredPins.map((pin) => ({
        id: pin.id,
        type: pin.type,
        url: pin.url,
        mime_type: pin.mime_type,
        width: pin.width,
        height: pin.height,
      })),
    [filteredPins],
  );

  function handleExport() {
    try {
      const blob = new Blob([buildSavedExportJson(saved)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `koleksi-tersimpan-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Cadangan JSON diunduh");
    } catch {
      toast.error("Gagal mengekspor koleksi.");
    }
  }

  function handleClearConfirm() {
    clearSaved();
    setConfirmClearOpen(false);
    toast.success("Koleksi tersimpan dikosongkan");
  }

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

  if (current?.error) {
    return (
      <EmptyState
        title="Belum bisa dimuat"
        description={current.error}
        action={
          <Button
            size="sm"
            onClick={() => {
              loadedKey.current = null;
              setState(null);
              setReloadTick((t) => t + 1);
            }}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Coba lagi
          </Button>
        }
      />
    );
  }
  if (!current?.data) {
    return (
      <SkeletonScreen label="Memuat koleksi tersimpan">
        <SkeletonMasonry count={6} />
      </SkeletonScreen>
    );
  }

  const hasBoth = rawPins.length > 0 && rawPosts.length > 0;
  const showPins = (tab === "all" || tab === "pin") && filteredPins.length > 0;
  const showPosts =
    (tab === "all" || tab === "post") && filteredPosts.length > 0;

  return (
    <div className="space-y-5">
      {/* Bar kontrol atas */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Cari di koleksi tersimpan…"
            />
          </div>
          {hasBoth && (
            <div className="sm:w-64 sm:shrink-0">
              <Segmented
                value={tab}
                onChange={setTab}
                options={[
                  { label: "Semua", value: "all" },
                  { label: `Pin (${rawPins.length})`, value: "pin" },
                  { label: `Artikel (${rawPosts.length})`, value: "post" },
                ]}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setSort((prev) => (prev === "newest" ? "oldest" : "newest"))
              }
              className="bg-surface-2 text-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <ArrowUpDown className="size-3.5" aria-hidden="true" />
              {sort === "newest" ? "Terbaru disimpan" : "Terlama disimpan"}
            </button>

            {pinSlides.length > 0 && (tab === "all" || tab === "pin") && (
              <button
                type="button"
                onClick={() => setSlideshowOpen(true)}
                className="bg-surface-2 text-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              >
                <Play className="size-3.5 fill-current" aria-hidden="true" />
                Slideshow
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {showPins && (
              <MediaGridControls
                density={density}
                onDensityChange={setDensity}
                showAspectFilter={false}
              />
            )}
            <button
              type="button"
              onClick={handleExport}
              title="Unduh cadangan JSON"
              className="bg-surface-2 text-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <Download className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Ekspor</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              title="Kosongkan koleksi tersimpan"
              className="bg-surface-2 text-danger hover:bg-tone-red/12 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Kosongkan</span>
            </button>
          </div>
        </div>
      </div>

      {!showPins && !showPosts ? (
        <p className="text-muted py-10 text-center text-sm">
          Tidak ada item tersimpan yang cocok dengan pencarianmu.
        </p>
      ) : (
        <div className="space-y-7">
          {showPins && (
            <section>
              <SectionHeader
                title="Pin"
                subtitle={`${filteredPins.length} pin tersimpan`}
              />
              <Masonry density={density}>
                {filteredPins.map((pin, index) => (
                  <div key={pin.id} {...listReveal(index)}>
                    <MediaCard media={pin} showMeta />
                  </div>
                ))}
              </Masonry>
            </section>
          )}
          {showPosts && (
            <section>
              <SectionHeader
                title="Artikel"
                subtitle={`${filteredPosts.length} artikel tersimpan`}
              />
              <div className="space-y-2">
                {filteredPosts.map((post) => (
                  <PostRow key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <MediaLightbox
        open={slideshowOpen}
        onClose={() => setSlideshowOpen(false)}
        slides={pinSlides}
        label="Koleksi Pin Tersimpan"
      />

      <Modal
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        title="Kosongkan Koleksi?"
      >
        <div className="space-y-4">
          <p className="text-muted text-sm leading-relaxed">
            Semua <strong>{saved.length}</strong> item tersimpan di perangkat ini
            akan dilepas. Konten asli di situs tidak ikut terhapus.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmClearOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleClearConfirm}
            >
              Ya, Kosongkan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
