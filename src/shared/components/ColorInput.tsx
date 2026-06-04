import type { InputEvent } from "react";

import { Input } from "@/components/ui/input";

interface ColorInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

function ColorInput({ id, value, onChange, label, placeholder }: ColorInputProps) {
  return (
    <div className="grid gap-1">
      {label ? (
        <div className="flex items-center gap-2">
          <label
            htmlFor={id}
            className="text-[9px] font-medium uppercase tracking-[0.16em] text-ink-dim leading-none"
          >
            {label}
          </label>
          {value ? (
            <span
              className="h-4 w-4 rounded-full inline-block"
              style={{ backgroundColor: value }}
            />
          ) : null}
        </div>
      ) : null}
      <Input
        id={id}
        value={value}
        onInput={(event: InputEvent<HTMLInputElement>) => {
          onChange((event.target as HTMLInputElement).value);
        }}
        placeholder={placeholder}
      />
    </div>
  );
}

export { ColorInput };
