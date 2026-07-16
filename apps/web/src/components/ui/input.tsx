import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border border-ink/15 bg-paper px-4 text-base outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20 sm:text-sm",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
