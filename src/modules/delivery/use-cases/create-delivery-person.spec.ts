import { describe, expect, it } from "vitest";
import { errAsync, okAsync } from "neverthrow";

import type { DeliveryPerson } from "@/modules/delivery/domain/delivery-person";
import { DeliveryPersonError } from "@/modules/delivery/domain/errors";
import type { DeliveryPersonCreateInput, DeliveryPersonRepository } from "@/modules/delivery/domain/ports";
import { createDeliveryPerson } from "@/modules/delivery/use-cases/create-delivery-person";

function buildDeliveryPerson(overrides: Partial<DeliveryPerson> = {}): DeliveryPerson {
  return {
    id: overrides.id ?? "driver-1",
    name: overrides.name ?? "Carlos Mendoza",
    color: overrides.color ?? "#FF5733",
    phone: overrides.phone ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T10:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T10:00:00.000Z"),
    deletedAt: overrides.deletedAt ?? null,
  };
}

describe("createDeliveryPerson", () => {
  it("delegates to repository.create() and returns the created driver", async () => {
    const input: DeliveryPersonCreateInput = { name: "Carlos Mendoza", color: "#FF5733", phone: "555-1234" };
    const created = buildDeliveryPerson({ name: input.name, color: input.color, phone: input.phone });

    const mockRepository = {
      create: (i: DeliveryPersonCreateInput) => {
        expect(i).toEqual(input);
        return okAsync(created);
      },
    } as unknown as DeliveryPersonRepository;

    const result = await createDeliveryPerson(mockRepository, input);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toEqual(created);
  });

  it("delegates to repository.create() with phone null when omitted", async () => {
    const input: DeliveryPersonCreateInput = { name: "Ana López", color: "#00AAFF" };
    const created = buildDeliveryPerson({ name: input.name, color: input.color, phone: null });

    const mockRepository = {
      create: () => okAsync(created),
    } as unknown as DeliveryPersonRepository;

    const result = await createDeliveryPerson(mockRepository, input);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value.phone).toBeNull();
  });

  it("propagates repository validation errors", async () => {
    const input: DeliveryPersonCreateInput = { name: "", color: "#FF5733" };
    const mockError = new DeliveryPersonError("Delivery person name is required");

    const mockRepository = {
      create: () => errAsync(mockError),
    } as unknown as DeliveryPersonRepository;

    const result = await createDeliveryPerson(mockRepository, input);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected createDeliveryPerson to fail");
    }

    expect(result.error).toBe(mockError);
  });
});
