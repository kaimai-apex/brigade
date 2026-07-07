import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-28 w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
