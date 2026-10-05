import type { ComponentPropsWithRef } from "react";
import { cn } from "@/lib/utils/cn";
import { fieldClass } from "@/components/ui/input";

/** Textarea bergaya iOS (senada dengan Input). Reusable. */
export function Textarea({
  className,
  ...props
}: ComponentPropsWithRef<"textarea">) {
  return (
    <textarea
      className={fieldClass(
        "self",
        cn(
          "placeholder:text-muted w-full rounded-2xl px-4 py-2.5 text-base outline-hidden sm:text-subhead",
          className,
        ),
      )}
      {...props}
    />
  );
}
