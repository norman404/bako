import { describe, expect, it } from "vitest";
import { errAsync, okAsync } from "neverthrow";

import type { DeliveryPerson } from "@/modules/delivery/domain/delivery-person";
import { DeliveryPersonError } from "@/modules/delivery/domain/errors";
import type { DeliveryPersonRepository } from "@/modules/delivery/domain/ports";
import { listDeliveryPersons } from "@/modules/delivery/use-cases/list-delivery-persons";

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

describe("listDeliveryPersons", () => {
  it("delegates to repository.list() and returns drivers", async () => {
    const mockDrivers = [buildDeliveryPerson({ id: "d1" }), buildDeliveryPerson({ id: "d2" })];
    const mockRepository: DeliveryPersonRepository = {
      list: () => okAsync(mockDrivers),
    } as DeliveryPersonRepository;

    const result = await listDeliveryPersons(mockRepository);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toEqual(mockDrivers);
  });

  it("returns empty array when no drivers exist", async () => {
    const mockRepository: DeliveryPersonRepository = {
      list: () => okAsync([] as DeliveryPerson[]),
    } as DeliveryPersonRepository;

    const result = await listDeliveryPersons(mockRepository);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toHaveLength(0);
  });

  it("propagates repository errors", async () => {
    const mockError = new DeliveryPersonError("Database connection failed");
    const mockRepository: DeliveryPersonRepository = {
      list: () => errAsync(mockError),
    } as DeliveryPersonRepository;

    const result = await listDeliveryPersons(mockRepository);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected listDeliveryPersons to fail");
    }

    expect(result.error).toBe(mockError);
  });
});
