import { Search } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps extends ComponentProps<typeof Input> {
  icon?: ReactNode;
  containerClassName?: string;
}

function SearchInput({ icon, containerClassName, className, ...props }: SearchInputProps) {
  return (
    <div className={cn("relative", containerClassName)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim [&_svg]:h-4 [&_svg]:w-4">
        {icon ?? <Search />}
      </span>
      <Input className={cn("pl-10", className)} {...props} />
    </div>
  );
}

export { SearchInput };
