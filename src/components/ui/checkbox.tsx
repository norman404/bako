import { type ComponentProps } from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

function Checkbox({
  className,
  ref,
  ...props
}: ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      data-slot="checkbox"
      className={cn(
        "grid place-content-center peer h-4 w-4 shrink-0 cursor-pointer rounded-sm border border-primary bg-surface-raised transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-on-primary",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className={cn("grid place-content-center text-current")}>
        <Check className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
