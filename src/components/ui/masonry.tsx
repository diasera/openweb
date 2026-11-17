import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Grid masonry ala Pinterest tanpa library (utility `masonry` di globals.css:
 * grid-lanes bila didukung, CSS columns sebagai fallback). Mode `comfortable`
 * memakai 2/3/4 kolom; `compact` merapatkan tampilan ke 3/4/5 kolom.
 */
export function Masonry({
  density = "comfortable",
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  density?: "comfortable" | "compact";
}) {
  return (
    <div
      className={cn(
        "masonry",
        density === "compact" &&
          "[--masonry-columns:3] [--masonry-gap:0.5rem] md:[--masonry-columns:4] md:[--masonry-gap:0.75rem] lg:[--masonry-columns:5]",
        className,
      )}
      {...props}
    />
  );
}
