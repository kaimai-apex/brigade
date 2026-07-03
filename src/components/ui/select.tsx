import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-xl border border-ink/15 bg-paper px-4 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/20",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
