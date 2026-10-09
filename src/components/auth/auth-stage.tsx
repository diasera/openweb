import type { CSSProperties, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { MotionLink } from "@/components/motion";
import { ThemeToggle } from "@/components/public/theme-toggle";
import { MediaPreview } from "@/components/ui/media-preview";
import {
  MEDIA_ASPECT_LIMITS,
  mediaDisplayAspectRatio,
} from "@/lib/media/display";
import { slidePreviewUrl, type MediaSlide } from "@/lib/media/slides";
import type { MediaRow } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import styles from "./auth-gate.module.css";

export type AuthWallMedia = Pick<
  MediaRow,
  "id" | "type" | "url" | "thumbnail_url" | "width" | "height"
>;

interface WallTile {
  key: string;
  seed: string;
  ratio: number;
  media: Pick<MediaSlide, "type" | "url" | "thumbnail_url">;
}

const WALL_COLUMNS = 6;
const TILES_PER_COLUMN = 6;
/** Durasi satu putaran per kolom (detik); berbeda agar dinding tidak seragam. */
const COLUMN_DRIFT = [78, 96, 70, 88, 104, 82];
/** Rasio pin placeholder saat situs belum punya foto (mode demo/instalasi baru). */
const PLACEHOLDER_RATIOS = [3 / 4, 1, 4 / 5, 2 / 3, 5 / 4, 3 / 5];
const PLACEHOLDER_MEDIA = { type: "photo", url: "", thumbnail_url: null } as const;

/**
 * Isi dinding dari media yang punya gambar diam, diulang secukupnya dengan
 * awal berbeda per kolom; tanpa media sama sekali dinding memakai gradien tema.
 */
function buildWall(media: readonly AuthWallMedia[]): WallTile[][] {
  const stills = media.filter((item) => slidePreviewUrl(item));
  return Array.from({ length: WALL_COLUMNS }, (_, column) =>
    Array.from({ length: TILES_PER_COLUMN }, (_, row) => {
      const key = `${column}-${row}`;
      if (stills.length === 0) {
        return {
          key,
          seed: `wall-${key}`,
          ratio: PLACEHOLDER_RATIOS[(column + row * 2) % PLACEHOLDER_RATIOS.length],
          media: PLACEHOLDER_MEDIA,
        };
      }
      const item = stills[(column * (TILES_PER_COLUMN + 2) + row) % stills.length];
      return {
        key: `${key}-${item.id}`,
        seed: item.id,
        ratio: mediaDisplayAspectRatio(
          item.width,
          item.height,
          3 / 4,
          MEDIA_ASPECT_LIMITS.card,
        ),
        media: item,
      };
    }),
  );
}

/**
 * Panggung gerbang Auth (login & setup owner): dinding pin dari karya situs
 * sendiri yang bergeser pelan, lapisan pembaca bertoken tema, lalu kartu form
 * dari halaman. Chrome aplikasi (island/tab bar) sengaja tidak tampil di sini.
 */
export function AuthStage({
  media,
  children,
}: {
  media: readonly AuthWallMedia[];
  children: ReactNode;
}) {
  const columns = buildWall(media);

  return (
    <div className="app-screen relative isolate flex flex-col">
      <div className={styles.wallViewport} aria-hidden="true">
        <div className={styles.wall}>
          {columns.map((column, index) => (
            <div
              key={index}
              className={styles.column}
              style={{ "--drift": `${COLUMN_DRIFT[index]}s` } as CSSProperties}
            >
              {[...column, ...column].map((tile, order) => (
                <div
                  key={`${tile.key}-${order}`}
                  className={cn(styles.tile, "rounded-pin bg-surface-2")}
                  style={{ aspectRatio: tile.ratio }}
                >
                  <MediaPreview
                    media={tile.media}
                    alt=""
                    sizes="(max-width: 767px) 45vw, (max-width: 1023px) 33vw, 22vw"
                    seed={tile.seed}
                    stillOnly
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.scrim} aria-hidden="true" />

      <header className="safe-inline relative z-10 flex items-center justify-between gap-3 pt-[calc(0.75rem+var(--safe-top))]">
        <MotionLink
          href="/"
          className="glass-button inline-flex h-9 items-center gap-1.5 rounded-full pl-2.5 pr-3.5 text-footnote font-semibold"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Kembali ke situs
        </MotionLink>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-end justify-center pt-6 sm:items-center sm:px-6 sm:pb-10">
        {children}
      </main>
    </div>
  );
}
