import {
  Check,
  CircleAlert,
  Info,
  LoaderCircle,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { IslandNotice } from "../dynamic-island.types";
import styles from "../dynamic-island.module.css";

export function NoticeView({ notice }: { notice: IslandNotice }) {
  const icon =
    notice.status === "loading" ? (
      <LoaderCircle className={cn(styles.noticeLoader, "h-5 w-5")} />
    ) : notice.status === "success" ? (
      <Check className="h-5 w-5" strokeWidth={2.8} />
    ) : notice.status === "error" ? (
      <CircleAlert className="h-5 w-5" />
    ) : (
      <Info className="h-5 w-5" />
    );

  const statusClass =
    notice.status === "error"
      ? styles.noticeError
      : notice.status === "success"
        ? styles.noticeSuccess
        : notice.status === "loading"
          ? styles.noticeLoading
          : styles.noticeInfo;

  return (
    <div
      className="flex h-full items-center gap-3 px-3.5"
      role={notice.status === "error" ? "alert" : "status"}
    >
      <span
        className={cn(
          styles.noticeIcon,
          statusClass,
          "grid h-10 w-10 shrink-0 place-items-center rounded-full",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-tight">
          {notice.title}
        </span>
        {notice.description && (
          <span
            className={cn(
              "text-muted mt-0.5 block text-[11px] leading-tight",
              notice.status === "error" ? "line-clamp-2" : "truncate",
            )}
          >
            {notice.description}
          </span>
        )}
      </span>
    </div>
  );
}
