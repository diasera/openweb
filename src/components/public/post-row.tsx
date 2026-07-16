import Image from "next/image";
import { categoryColor } from "@/lib/categories";
import { readingTime } from "@/lib/utils/reading-time";
import { gradientCss } from "@/lib/utils/color";
import { cardClass } from "@/components/ui/card";
import type { PublicPostCard } from "@/lib/data";
import { MotionLink } from "@/components/motion";

/** Baris artikel di daftar blog: thumbnail + kategori + judul + ringkasan + meta. */
export function PostRow({ post }: { post: PublicPostCard }) {
  return (
    <MotionLink
      href={`/blog/${post.slug}`}
      prefetch={false}
      className={cardClass("interactive", "flex gap-3 p-3")}
    >
      <div
        className="bg-surface-2 relative h-20 w-20 shrink-0 overflow-hidden rounded-xl"
      >
        {post.cover_image_url ? (
          <Image src={post.cover_image_url} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: gradientCss(post.id) }} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {post.category && (
          <p
            className="text-[11px] font-bold uppercase tracking-wide"
            style={{ color: categoryColor(post.category) }}
          >
            {post.category}
          </p>
        )}
        <p className="font-display line-clamp-2 font-bold leading-tight">{post.title}</p>
        {post.excerpt && (
          <p className="text-muted line-clamp-2 text-xs">{post.excerpt}</p>
        )}
        <p className="text-muted mt-1 text-[11px]">
          {post.author_name || "Redaksi"} · {readingTime(post.content_html)} mnt
        </p>
      </div>
    </MotionLink>
  );
}
