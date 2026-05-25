import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-sharp text-sm font-semibold",
    "transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out",
    "disabled:pointer-events-none disabled:opacity-40",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-champagne/60 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "border border-champagne/70 bg-champagne text-obsidian shadow-primary hover:border-champagne hover:bg-champagne-light hover:shadow-primary-raised",
        secondary:
          "border border-hairline-strong bg-obsidian-elevated text-ink shadow-inset-subtle hover:border-champagne/35 hover:bg-surface1 hover:text-ink",
        outline:
          "border border-hairline-strong bg-transparent text-ink hover:border-champagne/40 hover:bg-obsidian-elevated hover:text-ink",
        ghost:
          "bg-transparent text-ink-muted hover:bg-obsidian-elevated hover:text-ink",
        danger:
          "border border-danger/45 bg-danger/10 text-danger shadow-inset-subtle-sm hover:bg-danger/16 hover:text-danger-light",
      },
      size: {
        small: "h-8 px-3 text-[11px] uppercase tracking-[0.16em]",
        medium: "h-10 px-4",
        large: "h-14 px-6 text-[15px]",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "medium",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
  };

function Button({ className, variant, size, asChild = false, type = "button", ...props }: ButtonProps) {
  const Comp = (asChild ? Slot : "button") as any;

  return <Comp className={cn(buttonVariants({ variant, size, className }))} type={asChild ? undefined : type} {...props} />;
}

export { Button, buttonVariants };
