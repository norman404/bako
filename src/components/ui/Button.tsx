import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex cursor-pointer gap-2",
    "rounded-sharp text-sm font-semibold",
    "transition-[color,background-color,border-color,box-shadow] duration-200 ease-out",
    "disabled:pointer-events-none disabled:opacity-40",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default: "bg-primary text-on-primary hover:bg-primary-strong",
        secondary:
          "border border-border bg-surface-raised text-text hover:border-border-strong hover:bg-surface-sunken",
        outline:
          "border border-border-strong bg-transparent text-text hover:bg-surface-sunken",
        ghost: "bg-transparent text-text-muted hover:bg-surface-sunken hover:text-text",
        danger: "border border-danger/40 bg-transparent text-danger hover:bg-danger/10",
        cta: "bg-cta text-on-cta font-bold shadow-cta hover:bg-cta-strong",
      },
      size: {
        small: "h-8 px-3 text-2xs uppercase tracking-[0.16em] whitespace-nowrap items-center justify-center",
        medium: "h-10 px-4 whitespace-nowrap items-center justify-center",
        large: "h-14 px-6 text-md whitespace-nowrap items-center justify-center",
        icon: "h-10 w-10 p-0 whitespace-nowrap items-center justify-center",
      },
    },
    defaultVariants: {
      variant: "default",
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
