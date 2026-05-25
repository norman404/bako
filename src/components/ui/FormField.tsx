import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}

function FormField({ label, htmlFor, children, className }: FormFieldProps) {
  return (
    <div className={cn("grid gap-1", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export { FormField };
