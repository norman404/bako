import { useState } from "react";

import { Input } from "@/components/ui/input";
import { parseProductPriceInput } from "@/modules/menu/lib/product-price";

interface CurrencyInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
}

export function CurrencyInput({
  id,
  value,
  onChange,
  onBlur,
  placeholder = "0.00",
  disabled,
  ariaLabel,
  className = "",
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const displayValue = (() => {
    if (isFocused) return value;
    if (value.length === 0) return "";
    const parsed = parseProductPriceInput(value);
    if (parsed === null) return value;
    return (parsed / 100).toFixed(2);
  })();

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono-tabular text-lg text-text-dim">
        $
      </span>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          onBlur?.();
        }}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`h-12 pl-8 font-mono-tabular text-lg text-text placeholder:text-text-dim ${className}`}
      />
    </div>
  );
}