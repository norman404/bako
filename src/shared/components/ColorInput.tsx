import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface ColorInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

const PRESET_COLORS = [
  "#f38ba8", "#fab387", "#f9e2af", "#a6e3a1", "#94e2d5",
  "#89dceb", "#74c7ec", "#cba6f7", "#f5c2e7", "#eba0ac",
  "#d20f39", "#fe640b", "#df8e1d", "#40a02b", "#179299",
  "#04a5e5", "#209fb5", "#8839ef", "#ea76cb", "#e64553",
  "#6c7086", "#7f849c", "#9399b2", "#bac2de", "#cdd6f4",
];

function ColorInput({ id, value, onChange, label, placeholder }: ColorInputProps) {
  const [open, setOpen] = useState(false);

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
              className="h-4 w-4 rounded-full inline-block border border-hairline"
              style={{ backgroundColor: value }}
            />
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Abrir selector de color"
              className="h-9 w-9 shrink-0 rounded-card border border-hairline bg-obsidian-raised flex items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-champagne/20"
            >
              {value ? (
                <span
                  className="h-5 w-5 rounded-full inline-block border border-hairline"
                  style={{ backgroundColor: value }}
                />
              ) : (
                <span className="h-5 w-5 rounded-full inline-block border border-dashed border-ink-dim" />
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent className="w-64 p-3">
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Seleccionar color ${color}`}
                  onClick={() => {
                    onChange(color);
                    setOpen(false);
                  }}
                  className="h-8 w-8 rounded-full border border-hairline transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-champagne/40"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className="mt-3 pt-2 border-t border-hairline">
              <p className="text-[10px] text-ink-dim uppercase tracking-wider mb-1.5">
                Código personalizado
              </p>
              <Input
                value={value}
                onInput={(event) => {
                  onChange(event.currentTarget.value);
                }}
                placeholder="#C8E6C9"
                className="text-[13px]"
              />
            </div>
          </PopoverContent>
        </Popover>

        <Input
          id={id}
          value={value}
          onInput={(event) => {
            onChange(event.currentTarget.value);
          }}
          placeholder={placeholder}
          className="flex-1"
        />
      </div>
    </div>
  );
}

export { ColorInput };
