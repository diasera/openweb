import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/** Textarea bergaya iOS (senada dengan Input). Reusable. */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "border-border bg-surface placeholder:text-muted focus:border-primary focus:ring-primary/30 w-full rounded-2xl border px-4 py-2.5 text-base outline-none transition focus:ring-2 sm:text-[15px]",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
