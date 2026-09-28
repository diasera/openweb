import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";
import { fieldClass } from "@/components/ui/input";

/** Textarea bergaya iOS (senada dengan Input). Reusable. */
export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={fieldClass(
      "self",
      cn(
        "placeholder:text-muted w-full rounded-2xl px-4 py-2.5 text-base outline-hidden sm:text-subhead",
        className,
      ),
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
