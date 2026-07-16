import { cn } from "@/lib/utils/cn";
import styles from "./music.module.css";

export function MusicBars({
  playing,
  className,
}: {
  playing: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(styles.bars, !playing && styles.paused, className)}
      aria-hidden="true"
    >
      <span />
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}
