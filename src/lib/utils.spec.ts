import { describe, expect, it } from "bun:test";

import { cn } from "./utils";

/**
 * `cn()` es `twMerge(clsx(...))`. Los tokens de diseño de Bako viven en el
 * bloque `@theme` de `src/styles/app.css`; tailwind-merge no los descubre solo,
 * así que estos tests fijan el contrato de resolución de conflictos para los
 * grupos custom (font-size, radius, shadow, color) además del comportamiento
 * estándar.
 */
describe("cn", () => {
  describe("comportamiento base de tailwind-merge + clsx", () => {
    it("deja ganar la última clase en un conflicto de padding estándar", () => {
      expect(cn("px-2", "px-4")).toBe("px-4");
    });

    it("deja ganar el último font-size estándar", () => {
      expect(cn("text-sm", "text-lg")).toBe("text-lg");
    });

    it("resuelve condicionales y arreglos vía clsx", () => {
      const isActive: boolean = false;

      expect(cn("a", isActive && "b", ["c"])).toBe("a c");
    });
  });

  describe("font-size custom vs color custom (mismo prefijo `text-`)", () => {
    it("conserva ambas: `text-2xs` es tamaño y `text-text-dim` es color", () => {
      const result = cn("text-2xs", "text-text-dim");

      expect(result).toContain("text-2xs");
      expect(result).toContain("text-text-dim");
    });

    it("conserva ambas: `text-md` es tamaño y `text-primary` es color", () => {
      const result = cn("text-md", "text-primary");

      expect(result).toContain("text-md");
      expect(result).toContain("text-primary");
    });
  });

  describe("font-sizes custom entre sí", () => {
    it("deja ganar la última entre dos tamaños custom", () => {
      expect(cn("text-2xs", "text-display")).toBe("text-display");
    });

    it("deja ganar la última entre un tamaño custom y uno estándar", () => {
      expect(cn("text-md", "text-lg")).toBe("text-lg");
    });
  });

  describe("border-radius custom", () => {
    it("deja ganar el último entre dos radios custom", () => {
      expect(cn("rounded-card", "rounded-modal")).toBe("rounded-modal");
    });

    it("deja ganar el último entre `rounded-sharp` y `rounded-card`", () => {
      expect(cn("rounded-sharp", "rounded-card")).toBe("rounded-card");
    });

    it("deja ganar el radio custom sobre uno estándar", () => {
      expect(cn("rounded-md", "rounded-card")).toBe("rounded-card");
    });
  });

  describe("shadows custom", () => {
    it("deja ganar la última entre dos sombras custom", () => {
      expect(cn("shadow-card", "shadow-modal")).toBe("shadow-modal");
    });
  });

  describe("colores custom", () => {
    it("deja ganar el último background dentro del mismo grupo", () => {
      expect(cn("bg-surface", "bg-surface-raised")).toBe("bg-surface-raised");
    });
  });
});
