import { ChevronLeft, ChevronRight } from "lucide-react";
import { MotionLink } from "@/components/motion";
import { cn } from "@/lib/utils/cn";

/** Jendela nomor halaman ringkas: 1 … (current-1) current (current+1) … last. */
function pageWindow(current: number, total: number): Array<number | "gap"> {
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);

  const result: Array<number | "gap"> = [];
  let previous = 0;
  for (const page of sorted) {
    if (page - previous > 1) result.push("gap");
    result.push(page);
    previous = page;
  }
  return result;
}

function pageHref(
  basePath: string,
  page: number,
  query: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value && key !== "page") params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

/**
 * Navigasi halaman server-rendered (ramah SEO/ISR) — dipakai galeri, blog,
 * album, dan daftar admin. `query` mempertahankan filter lain (mis. status).
 */
export function Pagination({
  basePath,
  current,
  total,
  query = {},
}: {
  basePath: string;
  current: number;
  total: number;
  query?: Record<string, string | undefined>;
}) {
  if (total <= 1) return null;

  return (
    <nav
      aria-label="Navigasi halaman"
      className="mt-6 flex items-center justify-center gap-1.5"
    >
      {current > 1 ? (
        <MotionLink
          href={pageHref(basePath, current - 1, query)}
          aria-label="Halaman sebelumnya"
          className="motion-pressable text-muted hover:text-foreground grid h-10 w-10 place-items-center rounded-full transition-colors"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </MotionLink>
      ) : (
        <span className="text-muted/40 grid h-10 w-10 place-items-center">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </span>
      )}

      {pageWindow(current, total).map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} className="text-muted px-1 text-sm">
            …
          </span>
        ) : (
          <MotionLink
            key={entry}
            href={pageHref(basePath, entry, query)}
            aria-current={entry === current ? "page" : undefined}
            className={cn(
              "motion-pressable grid h-10 min-w-10 place-items-center rounded-full px-2 text-sm font-semibold transition-colors",
              entry === current
                ? "bg-primary text-primary-foreground"
                : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {entry}
          </MotionLink>
        ),
      )}

      {current < total ? (
        <MotionLink
          href={pageHref(basePath, current + 1, query)}
          aria-label="Halaman berikutnya"
          className="motion-pressable text-muted hover:text-foreground grid h-10 w-10 place-items-center rounded-full transition-colors"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </MotionLink>
      ) : (
        <span className="text-muted/40 grid h-10 w-10 place-items-center">
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
