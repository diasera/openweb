import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { gradientCss } from "@/lib/utils/color";
import { Avatar } from "@/components/ui/avatar";
import { cardClass } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { RelativeTime } from "@/components/ui/relative-time";
import type { PublicPostCard } from "@/lib/data";
import { MotionLink, SharedMorph } from "@/components/motion";

/**
 * Kartu artikel terpusat dengan dua varian tata letak (Pola Sarang Laba-Laba):
 * - `row` (bawaan): ringkas horizontal untuk daftar sempit (Artikel Terkait, Tersimpan).
 * - `card`: kartu majalah editorial dengan sampul `16:10`, lencana kategori kaca,
 *   kutipan, avatar penulis, dan metadata baca untuk grid Beranda & Blog.
 */
export function PostRow({
  post,
  variant = "row",
  enableMorph = true,
}: {
  post: PublicPostCard;
  variant?: "row" | "card";
  enableMorph?: boolean;
}) {
  if (variant === "card") {
    return (
      <MotionLink
        href={`/blog/${post.slug}`}
        data-spotlight
        className={cardClass(
          "interactive",
          "group flex h-full flex-col overflow-hidden",
        )}
      >
        <SharedMorph
          name={`post-cover-${post.slug}`}
          enabled={enableMorph && Boolean(post.cover_image_url)}
        >
          <div className="bg-surface-2 relative aspect-[16/10] w-full overflow-hidden">
            {post.cover_image_url ? (
              <Image
                src={post.cover_image_url}
                alt={post.title}
                fill
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                className="motion-media-image object-cover"
              />
            ) : (
              <div
                className="grain absolute inset-0"
                style={{ background: gradientCss(post.id) }}
              />
            )}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-black/10"
            />
            {post.category && (
              <div className="absolute left-3 top-3">
                <Chip variant="glass">{post.category}</Chip>
              </div>
            )}
          </div>
        </SharedMorph>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="font-display group-hover:text-primary-readable line-clamp-2 text-base font-bold leading-snug tracking-tight transition-colors">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-muted mt-1.5 line-clamp-2 flex-1 text-footnote leading-relaxed">
              {post.excerpt}
            </p>
          )}
          <div className="border-border/60 mt-3.5 flex items-center justify-between gap-2 border-t pt-3">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar name={post.author_name || "Redaksi"} size={24} />
              <div className="min-w-0 text-caption2 leading-tight">
                <p className="truncate font-semibold">
                  {post.author_name || "Redaksi"}
                </p>
                <p className="text-muted truncate">
                  {post.published_at ? (
                    <>
                      <RelativeTime iso={post.published_at} /> ·{" "}
                    </>
                  ) : null}
                  {post.reading_minutes} mnt
                </p>
              </div>
            </div>
            <ArrowUpRight
              className="text-muted size-4 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </div>
        </div>
      </MotionLink>
    );
  }

  return (
    <MotionLink
      href={`/blog/${post.slug}`}
      className={cardClass("interactive", "group flex gap-3 p-3")}
    >
      <SharedMorph
        name={`post-cover-${post.slug}`}
        enabled={enableMorph && Boolean(post.cover_image_url)}
      >
        <div className="bg-surface-2 relative h-20 w-20 shrink-0 overflow-hidden rounded-xl">
          {post.cover_image_url ? (
            <Image
              src={post.cover_image_url}
              alt=""
              fill
              sizes="80px"
              className="motion-media-image object-cover"
            />
          ) : (
            <div
              className="grain absolute inset-0"
              style={{ background: gradientCss(post.id) }}
            />
          )}
        </div>
      </SharedMorph>
      <div className="min-w-0 flex-1">
        {post.category && (
          <p className="text-primary-readable text-caption2 font-bold uppercase tracking-wide">
            {post.category}
          </p>
        )}
        <p className="font-display group-hover:text-primary-readable line-clamp-2 font-bold leading-tight transition-colors">
          {post.title}
        </p>
        {post.excerpt && (
          <p className="text-muted mt-0.5 line-clamp-2 text-xs">
            {post.excerpt}
          </p>
        )}
        <p className="text-muted mt-1 text-caption2">
          {post.author_name || "Redaksi"} · {post.reading_minutes} mnt
        </p>
      </div>
    </MotionLink>
  );
}
