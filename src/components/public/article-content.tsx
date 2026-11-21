"use client";

import Image from "next/image";
import { Maximize2 } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { SharedMorph } from "@/components/motion";
import { MediaLightbox } from "@/components/ui/media-lightbox";
import type { MediaSlide } from "@/lib/media/slides";
import { cn } from "@/lib/utils/cn";

/**
 * Sampul artikel dengan morph View Transition dari daftar blog dan pembuka
 * Theater Lightbox layar penuh untuk melihat detail foto sampul.
 */
export function ArticleCover({
  slug,
  title,
  src,
  aspectRatio,
  objectFit,
}: {
  slug: string;
  title: string;
  src: string;
  aspectRatio: number;
  objectFit: "cover" | "contain";
}) {
  const [open, setOpen] = useState(false);
  const slides = useMemo<MediaSlide[]>(
    () => [
      {
        id: `cover-${slug}`,
        type: "photo",
        url: src,
        mime_type: null,
        width: null,
        height: null,
      },
    ],
    [slug, src],
  );

  return (
    <>
      <SharedMorph name={`post-cover-${slug}`}>
        <div
          onClick={() => setOpen(true)}
          role="button"
          tabIndex={0}
          aria-label={`Perbesar gambar sampul: ${title}`}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(true);
            }
          }}
          className="group rounded-ios-lg bg-surface-2 shadow-elevated relative mb-5 cursor-zoom-in overflow-hidden ring-1 ring-inset ring-black/6 dark:ring-white/10"
          style={{ aspectRatio }}
        >
          <Image
            src={src}
            alt={title}
            fill
            preload
            sizes="(max-width: 1023px) 100vw, 896px"
            className="motion-parallax"
            style={{ objectFit }}
          />
          <span
            aria-hidden="true"
            className="media-badge pointer-events-none absolute right-3 top-3 grid size-8 place-items-center rounded-full opacity-80 transition-opacity group-hover:opacity-100"
          >
            <Maximize2 className="size-3.75" />
          </span>
        </div>
      </SharedMorph>

      <MediaLightbox
        open={open}
        onClose={() => setOpen(false)}
        slides={slides}
        label={title}
      />
    </>
  );
}

/**
 * Pembungkus isi artikel HTML yang tetap dirender utuh sejak SSR untuk SEO,
 * lalu diperkaya secara progresif:
 * 1) Klik gambar ilustrasi membuka Theater Lightbox (zoom & geser antar foto artikel).
 * 2) Blok kode `<pre>` mendapat tombol "Salin" satu klik.
 */
export function ArticleContent({
  html,
  title,
  className,
}: {
  html: string;
  title: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const markup = useMemo(() => ({ __html: html }), [html]);
  const [lightboxState, setLightboxState] = useState<{
    slides: MediaSlide[];
    index: number;
  } | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const timers = new Set<ReturnType<typeof setTimeout>>();
    const cleanups: Array<() => void> = [];

    root.querySelectorAll<HTMLPreElement>("pre").forEach((pre) => {
      if (pre.querySelector("[data-article-copy]")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.articleCopy = "idle";
      button.className = "article-code-copy";
      button.textContent = "Salin";
      button.setAttribute("aria-label", "Salin kode");

      const handleCopy = async (event: Event) => {
        event.stopPropagation();
        const codeText = (pre.querySelector("code")?.textContent ?? pre.textContent ?? "").replace(
          /(?:Salin|Disalin)$/,
          "",
        );
        try {
          await navigator.clipboard.writeText(codeText.trimEnd());
          button.dataset.articleCopy = "copied";
          button.textContent = "Disalin";
          const timer = setTimeout(() => {
            timers.delete(timer);
            button.dataset.articleCopy = "idle";
            button.textContent = "Salin";
          }, 1800);
          timers.add(timer);
        } catch {
          // Abaikan bila izin clipboard ditolak browser.
        }
      };

      button.addEventListener("click", handleCopy);
      pre.appendChild(button);
      cleanups.push(() => {
        button.removeEventListener("click", handleCopy);
        button.remove();
      });
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      cleanups.forEach((fn) => fn());
    };
  }, [html]);

  function handleContentClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (!target || target.tagName !== "IMG" || target.closest("a[href]")) return;

    const root = rootRef.current;
    if (!root) return;

    const images = Array.from(root.querySelectorAll<HTMLImageElement>("img")).filter(
      (img) => !img.closest("a[href]") && Boolean(img.currentSrc || img.src),
    );
    const clickedIndex = images.indexOf(target as HTMLImageElement);
    if (clickedIndex < 0) return;

    const slides: MediaSlide[] = images.map((img, idx) => ({
      id: `article-img-${idx}-${img.getAttribute("src") ?? idx}`,
      type: "photo",
      url: img.currentSrc || img.src,
      mime_type: null,
      width: img.naturalWidth || null,
      height: img.naturalHeight || null,
    }));

    setLightboxState({ slides, index: clickedIndex });
  }

  return (
    <>
      <div
        ref={rootRef}
        onClick={handleContentClick}
        className={cn(
          "article-content prose prose-sm sm:prose-base prose-headings:font-display prose-a:text-primary-readable mt-6 max-w-none",
          className,
        )}
        dangerouslySetInnerHTML={markup}
      />

      <MediaLightbox
        open={lightboxState !== null}
        onClose={() => setLightboxState(null)}
        slides={lightboxState?.slides ?? []}
        initialIndex={lightboxState?.index ?? 0}
        label={title}
      />
    </>
  );
}
