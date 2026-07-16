import { describe, expect, it } from "vitest";
import i18next from "i18next";

import {
  CategoryNotFoundError,
  MenuDomainError,
  MenuNotFoundError,
  ModifierGroupNotFoundError,
  ModifierOptionNotFoundError,
  ProductNotFoundError,
} from "@/modules/menu/domain/errors";

import { translateMenuError } from "./translate-menu-error";

const testI18n = i18next.createInstance();
testI18n.init({
  lng: "es-MX",
  resources: {
    "es-MX": {
      errors: {
        menu: {
          productNotFound: "Producto no encontrado: {{productId}}",
          categoryNotFound: "Categoría no encontrada: {{categoryId}}",
          menuNotFound: "Menú no encontrado: {{menuId}}",
          modifierGroupNotFound: "Grupo de modificadores no encontrado: {{groupId}}",
          modifierOptionNotFound: "Opción de modificador no encontrada: {{optionId}}",
          generic: "Ocurrió un error inesperado",
        },
      },
    },
  },
});

const t = testI18n.getFixedT("es-MX", "errors");

describe("translateMenuError", () => {
  it("translates ProductNotFoundError", () => {
    const error = new ProductNotFoundError("prod-1");
    expect(translateMenuError(error, t)).toBe("Producto no encontrado: prod-1");
  });

  it("translates CategoryNotFoundError", () => {
    const error = new CategoryNotFoundError("cat-1");
    expect(translateMenuError(error, t)).toBe("Categoría no encontrada: cat-1");
  });

  it("translates MenuNotFoundError", () => {
    const error = new MenuNotFoundError("menu-1");
    expect(translateMenuError(error, t)).toBe("Menú no encontrado: menu-1");
  });

  it("translates ModifierGroupNotFoundError", () => {
    const error = new ModifierGroupNotFoundError("group-1");
    expect(translateMenuError(error, t)).toBe("Grupo de modificadores no encontrado: group-1");
  });

  it("translates ModifierOptionNotFoundError", () => {
    const error = new ModifierOptionNotFoundError("opt-1");
    expect(translateMenuError(error, t)).toBe("Opción de modificador no encontrada: opt-1");
  });

  it("falls back to a generic message for untranslatable MenuDomainError", () => {
    const error = new MenuDomainError("Something went wrong");
    expect(translateMenuError(error, t)).toBe("Ocurrió un error inesperado");
  });

  it("falls back to a generic message for non-menu errors", () => {
    const error = new Error("Unexpected failure");
    expect(translateMenuError(error, t)).toBe("Ocurrió un error inesperado");
  });

  it("falls back to a generic message for non-error values", () => {
    expect(translateMenuError("boom", t)).toBe("Ocurrió un error inesperado");
  });
});
