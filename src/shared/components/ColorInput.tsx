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
  "#ED8796", "#F5A97F", "#EED49F", "#A6DA95", "#8BD5CA",
  "#91D7E3", "#7DC4E4", "#C6A0F6", "#F5BDE6", "#EE99A0",
  "#6c7086", "#7f849c", "#9399b2", "#B8C0E0", "#CAD3F5",
];

function ColorInput({ id, value, onChange, label, placeholder }: ColorInputProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="grid gap-1">
      {label ? (
        <div className="flex items-center gap-2">
          <label
            htmlFor={id}
            className="text-2xs font-medium uppercase tracking-[0.16em] text-text-dim leading-none"
          >
            {label}
          </label>
          {value ? (
            <span
              className="h-4 w-4 rounded-full inline-block border border-border-strong"
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
              className="h-9 w-9 shrink-0 cursor-pointer rounded-card border border-border bg-surface-raised flex items-center justify-center transition-colors duration-200 hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {value ? (
                <span
                  className="h-5 w-5 rounded-full inline-block border border-border-strong"
                  style={{ backgroundColor: value }}
                />
              ) : (
                <span className="h-5 w-5 rounded-full inline-block border border-dashed border-text-dim" />
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
                  className="h-8 w-8 cursor-pointer rounded-full border border-border-strong transition-transform duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className="mt-3 pt-2 border-t border-border">
              <p className="text-2xs text-text-dim uppercase tracking-wider mb-1.5">
                Código personalizado
              </p>
              <Input
                value={value}
                onInput={(event) => {
                  onChange(event.currentTarget.value);
                }}
                placeholder="#C8E6C9"
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
