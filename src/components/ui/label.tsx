import { type ComponentProps } from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-2xs font-medium uppercase tracking-[0.16em] text-text-dim leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
);

type LabelProps =
  ComponentProps<typeof LabelPrimitive.Root> &
  VariantProps<typeof labelVariants>;

function Label({ className, ref, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      ref={ref}
      data-slot="label"
      className={cn(labelVariants(), className)}
      {...props}
    />
  );
}

export { Label };
