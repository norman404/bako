import { type ComponentProps } from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

type SwitchProps = ComponentProps<typeof SwitchPrimitive.Root>;

function Switch({ className, ref, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-border",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-[3px]"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
export type { SwitchProps };
