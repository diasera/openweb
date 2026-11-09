import { MotionLink } from "@/components/motion";
import { Chip } from "@/components/ui/chip";
import { buildQueryHref } from "@/lib/utils/url";

/**
 * Baris chip filter berbasis query URL (server-rendered, ramah SEO & paginasi).
 * Dipakai bersama oleh `/galeri` dan `/blog`.
 */
export function FilterChips({
  basePath,
  paramName,
  options,
  activeValue,
  preserveQuery = {},
  allLabel = "Semua Kategori",
  label = "Filter kategori",
}: {
  basePath: string;
  paramName: string;
  options: readonly string[];
  activeValue?: string;
  preserveQuery?: Record<string, string | undefined>;
  allLabel?: string;
  label?: string;
}) {
  const mergedOptions =
    activeValue &&
    !options.some(
      (item) => item.toLocaleLowerCase() === activeValue.toLocaleLowerCase(),
    )
      ? [activeValue, ...options]
      : options;

  if (mergedOptions.length === 0) return null;

  return (
    <nav
      aria-label={label}
      className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 py-0.5"
    >
      <MotionLink
        href={buildQueryHref(basePath, {
          ...preserveQuery,
          [paramName]: undefined,
        })}
        prefetch={false}
        aria-current={!activeValue ? "true" : undefined}
        className="shrink-0"
      >
        <Chip
          variant={!activeValue ? "primary" : "soft"}
          className="motion-pressable transition-colors hover:text-foreground"
        >
          {allLabel}
        </Chip>
      </MotionLink>
      {mergedOptions.map((option) => {
        const isActive =
          activeValue?.toLocaleLowerCase() === option.toLocaleLowerCase();
        return (
          <MotionLink
            key={option}
            href={buildQueryHref(basePath, {
              ...preserveQuery,
              [paramName]: isActive ? undefined : option,
            })}
            prefetch={false}
            aria-current={isActive ? "true" : undefined}
            className="shrink-0"
          >
            <Chip
              variant={isActive ? "primary" : "soft"}
              className="motion-pressable transition-colors hover:text-foreground"
            >
              {option}
            </Chip>
          </MotionLink>
        );
      })}
    </nav>
  );
}
