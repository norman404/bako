import { describe, expect, it } from "bun:test";
import i18next from "i18next";

import { CheckoutPersistenceError } from "@/modules/checkout/domain/errors";

import { translateCheckoutError } from "./translate-checkout-error";

const testI18n = i18next.createInstance();
testI18n.init({
  lng: "es-MX",
  resources: {
    "es-MX": {
      checkout: {
        errors: {
          customerNameRequired: "El nombre del cliente es obligatorio.",
          invalidPaymentMethod: "Método de pago inválido.",
          dbError: "No pudimos procesar el cobro. Intentá de nuevo.",
          generic: "Ocurrió un error inesperado al procesar el cobro.",
        },
      },
    },
  },
});

const t = testI18n.getFixedT("es-MX", "checkout");

describe("translateCheckoutError", () => {
  it("translates a checkout error code", () => {
    const error = new CheckoutPersistenceError("customerNameRequired");
    expect(translateCheckoutError(error, t)).toBe("El nombre del cliente es obligatorio.");
  });

  it("translates a validation error code", () => {
    const error = new CheckoutPersistenceError("invalidPaymentMethod");
    expect(translateCheckoutError(error, t)).toBe("Método de pago inválido.");
  });

  it("translates a DB error", () => {
    const error = new CheckoutPersistenceError("dbError", { context: "create order" });
    expect(translateCheckoutError(error, t)).toBe("No pudimos procesar el cobro. Intentá de nuevo.");
  });

  it("falls back to a generic message for non-checkout errors", () => {
    expect(translateCheckoutError(new Error("boom"), t)).toBe(
      "Ocurrió un error inesperado al procesar el cobro.",
    );
  });

  it("falls back to a generic message for non-error values", () => {
    expect(translateCheckoutError("boom", t)).toBe(
      "Ocurrió un error inesperado al procesar el cobro.",
    );
  });
});
