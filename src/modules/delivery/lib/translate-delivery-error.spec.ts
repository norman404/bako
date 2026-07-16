import { describe, expect, it } from "vitest";
import i18next from "i18next";

import { DeliveryPersonError, DeliveryPersonNotFoundError } from "@/modules/delivery/domain/errors";

import { translateDeliveryError } from "./translate-delivery-error";

const testI18n = i18next.createInstance();
testI18n.init({
  lng: "es-MX",
  resources: {
    "es-MX": {
      delivery: {
        errors: {
          deliveryPersonNameRequired: "El nombre del repartidor es obligatorio.",
          deliveryPersonNotFound: "Repartidor no encontrado: {{deliveryPersonId}}",
          generic: "Ocurrió un error con los repartidores.",
        },
      },
    },
  },
});

const t = testI18n.getFixedT("es-MX", "delivery");

describe("translateDeliveryError", () => {
  it("translates a delivery error code", () => {
    const error = new DeliveryPersonError("deliveryPersonNameRequired");
    expect(translateDeliveryError(error, t)).toBe("El nombre del repartidor es obligatorio.");
  });

  it("interpolates params", () => {
    const error = new DeliveryPersonNotFoundError("driver-1");
    expect(translateDeliveryError(error, t)).toBe("Repartidor no encontrado: driver-1");
  });

  it("falls back to generic for non-delivery errors", () => {
    expect(translateDeliveryError(new Error("boom"), t)).toBe("Ocurrió un error con los repartidores.");
  });
});
