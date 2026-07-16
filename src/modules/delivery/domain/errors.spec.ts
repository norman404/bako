import { describe, expect, it } from "vitest";

import { DeliveryPersonError, DeliveryPersonNotFoundError } from "./errors";

describe("delivery domain errors", () => {
  it("carries a translatable code and params", () => {
    const error = new DeliveryPersonError("deliveryPersonNameRequired");

    expect(error.kind).toBe("DeliveryPersonError");
    expect(error.code).toBe("deliveryPersonNameRequired");
    expect(error.message).toContain("deliveryPersonNameRequired");
  });

  it("DeliveryPersonNotFoundError carries the id", () => {
    const error = new DeliveryPersonNotFoundError("driver-1");

    expect(error.code).toBe("deliveryPersonNotFound");
    expect(error.params).toEqual({ deliveryPersonId: "driver-1" });
  });
});
