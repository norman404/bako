import { describe, expect, it } from "bun:test";
import i18next from "i18next";

import {
  NoActiveShiftError,
  ShiftAlreadyActiveError,
} from "@/modules/shift-reports/domain/errors";

import { translateShiftError } from "./translate-shift-error";

const testI18n = i18next.createInstance();
testI18n.init({
  lng: "es-MX",
  resources: {
    "es-MX": {
      shift: {
        errors: {
          shiftAlreadyActive: "Ya hay un turno activo.",
          noActiveShift: "No hay un turno activo.",
          generic: "Ocurrió un error con los turnos.",
        },
      },
    },
  },
});

const t = testI18n.getFixedT("es-MX", "shift");

describe("translateShiftError", () => {
  it("translates shiftAlreadyActive", () => {
    expect(translateShiftError(new ShiftAlreadyActiveError(), t)).toBe("Ya hay un turno activo.");
  });

  it("translates noActiveShift", () => {
    expect(translateShiftError(new NoActiveShiftError(), t)).toBe("No hay un turno activo.");
  });

  it("falls back to generic for non-shift errors", () => {
    expect(translateShiftError(new Error("boom"), t)).toBe("Ocurrió un error con los turnos.");
  });
});
