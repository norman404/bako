import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Los tokens de diseño de Bako se declaran en el bloque `@theme` de
 * `src/styles/app.css`; tailwind-merge no lee ese CSS, así que sin extender su
 * config trata los tokens custom como clases desconocidas y no resuelve sus
 * conflictos (`rounded-card` + `rounded-modal` sobrevivían las dos, y
 * `text-display` se clasificaba como color en vez de font-size).
 */

/** `--text-*`. Los t-shirt sizes ya los cubre el default; `display*` no. */
const FONT_SIZES = [
  "2xs",
  "xs",
  "sm",
  "base",
  "md",
  "lg",
  "xl",
  "display",
  "display-lg",
] as const;

/** `--radius-*`. Los t-shirt sizes (`sm`/`md`/`lg`/`xl`) ya los cubre el default. */
const RADII = ["sharp", "card", "modal"] as const;

/** `--shadow-*`. Sin declararlos caían en `shadow-color` en vez de `shadow`. */
const SHADOWS = ["card", "raised", "modal"] as const;

// Los colores custom NO se declaran: el grupo `color` del default ya acepta
// cualquier nombre, así que `bg-surface` vs `bg-surface-raised` y los alias
// shadcn resuelven bien sin configuración extra.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: FONT_SIZES,
      radius: RADII,
      shadow: SHADOWS,
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
