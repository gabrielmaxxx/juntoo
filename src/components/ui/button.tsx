import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-juntoo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden select-none",
  {
    variants: {
      variant: {
        default: "juntoo-gradient text-primary-foreground hover:opacity-90 juntoo-shadow active:scale-[0.97]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.97]",
        outline: "border-2 border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground active:scale-[0.97]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.97]",
        ghost: "hover:bg-accent/10 hover:text-accent active:scale-[0.97]",
        link: "text-primary underline-offset-4 hover:underline",
        fab: "bg-accent text-accent-foreground rounded-full juntoo-fab-shadow hover:scale-105 transition-juntoo-bounce active:scale-95",
        hero: "juntoo-gradient text-primary-foreground text-lg font-semibold py-4 px-8 juntoo-shadow-elevated hover:scale-[1.02] transition-juntoo-bounce active:scale-[0.98]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-xl px-8",
        icon: "h-10 w-10",
        fab: "h-14 w-14",
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
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (loading) return;

      // Ripple effect
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement("span");
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      ripple.style.width = ripple.style.height = `${diameter}px`;
      ripple.style.left = `${e.clientX - rect.left - radius}px`;
      ripple.style.top = `${e.clientY - rect.top - radius}px`;
      ripple.className = "ripple-effect";

      // Remove existing ripples
      const existingRipple = button.querySelector(".ripple-effect");
      if (existingRipple) existingRipple.remove();

      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);

      onClick?.(e);
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        onClick={asChild ? onClick : handleClick}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
