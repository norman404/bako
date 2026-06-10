/**
 * Accent derivado de un color de categoría (hex calibrado para acentos)
 * para usarse legiblemente sobre el theme oscuro (Catppuccin Macchiato).
 *
 * - bg:     tinte suave sobre la superficie oscura (fondo de chip/tarjeta)
 * - border: mezcla media con el borde del theme
 * - text:   mezcla en oklch con el texto claro del theme — garantiza contraste
 */

export interface CategoryAccent {
  bg: string;
  border: string;
  text: string;
}

const THEME_SURFACE = "#24273A";
const THEME_BORDER = "#363A4F";
const THEME_TEXT = "#CAD3F5";

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const FALLBACK_ACCENT: CategoryAccent = {
  bg: THEME_SURFACE,
  border: THEME_BORDER,
  text: THEME_TEXT,
};

export function categoryAccent(hex: string): CategoryAccent {
  const normalized = hex.trim();

  if (!HEX_PATTERN.test(normalized)) {
    return FALLBACK_ACCENT;
  }

  return {
    bg: `color-mix(in srgb, ${normalized} 20%, ${THEME_SURFACE})`,
    border: `color-mix(in srgb, ${normalized} 55%, ${THEME_BORDER})`,
    text: `color-mix(in oklch, ${normalized} 60%, ${THEME_TEXT})`,
  };
}
