import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-forest text-paper hover:bg-forest/90",
        secondary: "bg-ink text-paper hover:bg-ink/90",
        gold: "bg-gold text-ink hover:bg-gold/90",
        outline:
          "border border-forest bg-transparent text-forest hover:bg-forest/5",
        ghost: "hover:bg-ink/5",
        rust: "bg-rust text-paper hover:bg-rust/90",
        destructive: "bg-rust text-paper hover:bg-rust/90",
        link: "rounded-none text-forest underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 min-h-12 px-6 text-[15px]",
        sm: "h-9 min-h-9 px-4 text-sm",
        lg: "h-12 min-h-12 px-8 text-base",
        icon: "size-12",
        "icon-sm": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
