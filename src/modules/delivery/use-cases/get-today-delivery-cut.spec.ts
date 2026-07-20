import { describe, expect, it } from "bun:test";
import { errAsync, okAsync } from "neverthrow";

import type { DeliveryPersonCut } from "@/modules/delivery/domain/delivery-person";
import { DeliveryPersonError } from "@/modules/delivery/domain/errors";
import type { DeliveryPersonRepository } from "@/modules/delivery/domain/ports";
import { getTodayDeliveryCut } from "@/modules/delivery/use-cases/get-today-delivery-cut";

function buildDeliveryPersonCut(overrides: Partial<DeliveryPersonCut> = {}): DeliveryPersonCut {
  return {
    rows: overrides.rows ?? [],
    totalOrders: overrides.totalOrders ?? 0,
    totalSales: overrides.totalSales ?? 0,
    generatedAt: overrides.generatedAt ?? new Date("2026-05-31T12:00:00.000Z"),
  };
}

describe("getTodayDeliveryCut", () => {
  it("delegates to repository.getTodayCut() and returns the cut", async () => {
    const mockCut = buildDeliveryPersonCut({
      rows: [
        { deliveryPersonId: "d1", name: "Carlos", color: "#FF5733", ordersCount: 5, totalSales: 50000 },
        { deliveryPersonId: "d2", name: "Ana", color: "#00AAFF", ordersCount: 3, totalSales: 30000 },
      ],
      totalOrders: 8,
      totalSales: 80000,
    });

    const mockRepository: DeliveryPersonRepository = {
      getTodayCut: () => okAsync(mockCut),
    } as DeliveryPersonRepository;

    const result = await getTodayDeliveryCut(mockRepository);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toEqual(mockCut);
    expect(result.value.rows).toHaveLength(2);
    expect(result.value.totalOrders).toBe(8);
    expect(result.value.totalSales).toBe(80000);
  });

  it("returns empty cut when no deliveries today", async () => {
    const emptyCut = buildDeliveryPersonCut();

    const mockRepository: DeliveryPersonRepository = {
      getTodayCut: () => okAsync(emptyCut),
    } as DeliveryPersonRepository;

    const result = await getTodayDeliveryCut(mockRepository);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value.rows).toHaveLength(0);
    expect(result.value.totalOrders).toBe(0);
    expect(result.value.totalSales).toBe(0);
  });

  it("propagates repository errors", async () => {
    const mockError = new DeliveryPersonError("Failed to get today delivery cut");

    const mockRepository: DeliveryPersonRepository = {
      getTodayCut: () => errAsync(mockError),
    } as DeliveryPersonRepository;

    const result = await getTodayDeliveryCut(mockRepository);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected getTodayDeliveryCut to fail");
    }

    expect(result.error).toBe(mockError);
  });
});
