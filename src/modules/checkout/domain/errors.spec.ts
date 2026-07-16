import { describe, expect, it } from "vitest";

import { CheckoutPersistenceError } from "./errors";

describe("checkout domain errors", () => {
  it("carries a translatable code and params", () => {
    const error = new CheckoutPersistenceError("customerNameRequired", {
      field: "name",
    });

    expect(error.kind).toBe("CheckoutPersistenceError");
    expect(error.code).toBe("customerNameRequired");
    expect(error.params).toEqual({ field: "name" });
    expect(error.message).toContain("customerNameRequired");
  });

  it("supports DB errors with context for diagnostics", () => {
    const error = new CheckoutPersistenceError("dbError", {
      context: "Failed to create order",
      cause: "connection lost",
    });

    expect(error.code).toBe("dbError");
    expect(error.params).toEqual({
      context: "Failed to create order",
      cause: "connection lost",
    });
  });
});
