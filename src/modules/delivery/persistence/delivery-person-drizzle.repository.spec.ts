import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DeliveryPersonCreateInput } from "@/modules/delivery/domain/ports";
import type { DeliveryPersonRow } from "@/shared/db/schema";

const dbMocks = vi.hoisted(() => {
  const selectLimitMock = vi.fn<any>(() => Promise.resolve([]));
  const selectWhereMock = vi.fn<any>(() => ({ limit: selectLimitMock }));
  const selectGroupByMock = vi.fn<any>(() => Promise.resolve([]));
  const innerJoinWhereMock = vi.fn<any>(() => ({ groupBy: selectGroupByMock }));
  const selectMock = vi.fn<any>(() => ({
    from: () => ({
      where: selectWhereMock,
      innerJoin: () => ({ where: innerJoinWhereMock }),
    }),
  }));

  const insertReturningMock = vi.fn<() => Promise<DeliveryPersonRow[]>>();
  const insertValuesMock = vi.fn<(values: Partial<DeliveryPersonRow>) => { returning: typeof insertReturningMock }>(
    () => ({ returning: insertReturningMock }),
  );
  const insertMock = vi.fn(() => ({ values: insertValuesMock }));

  const updateReturningMock = vi.fn<() => Promise<(DeliveryPersonRow | { id: string })[]>>();
  const updateWhereMock = vi.fn(() => ({ returning: updateReturningMock }));
  const updateSetMock = vi.fn<(values: Partial<DeliveryPersonRow>) => { where: typeof updateWhereMock }>(
    () => ({ where: updateWhereMock }),
  );
  const updateMock = vi.fn(() => ({ set: updateSetMock }));

  return {
    selectLimitMock,
    selectWhereMock,
    selectGroupByMock,
    innerJoinWhereMock,
    selectMock,
    insertReturningMock,
    insertValuesMock,
    insertMock,
    updateReturningMock,
    updateWhereMock,
    updateSetMock,
    updateMock,
  };
});

vi.mock("@/shared/db/client", () => ({
  db: {
    select: dbMocks.selectMock,
    insert: dbMocks.insertMock,
    update: dbMocks.updateMock,
  },
}));

import { DeliveryPersonNotFoundError } from "@/modules/delivery/domain/errors";
import { deliveryPersonDrizzleRepository } from "@/modules/delivery/persistence/delivery-person-drizzle.repository";

const validInput: DeliveryPersonCreateInput = {
  name: "Carlos Mendoza",
  color: "#FF5733",
  phone: "555-1234",
};

function buildDeliveryPersonRow(overrides: Partial<DeliveryPersonRow> = {}): DeliveryPersonRow {
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

describe("deliveryPersonDrizzleRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.insertReturningMock.mockResolvedValue([]);
  });

  // ─── create ───────────────────────────────────────────────────────────────

  it("create generates a UUID id and persists trimmed values", async () => {
    const generatedId = "a7f5d5d8-9d8b-45ed-8d80-6c0d6a1c6f6a";
    dbMocks.insertReturningMock.mockResolvedValueOnce([buildDeliveryPersonRow({ id: generatedId })]);
    const randomUuidSpy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId);

    const result = await deliveryPersonDrizzleRepository.create({
      name: `  ${validInput.name}  `,
      color: validInput.color,
      phone: validInput.phone,
    });

    expect(randomUuidSpy).toHaveBeenCalledTimes(1);
    expect(dbMocks.insertValuesMock).toHaveBeenCalledTimes(1);
    expect(dbMocks.insertReturningMock).toHaveBeenCalledTimes(1);

    const inserted = dbMocks.insertValuesMock.mock.calls[0]![0] as DeliveryPersonRow;
    expect(inserted.id).toBe(generatedId);
    expect(inserted.name).toBe(validInput.name);
    expect(inserted.color).toBe(validInput.color);
    expect("deletedAt" in inserted).toBe(false);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.id).toBe(generatedId);
    expect(result.value.name).toBe(validInput.name);
  });

  it("create rejects empty name", async () => {
    const result = await deliveryPersonDrizzleRepository.create({
      name: "   ",
      color: "#FF5733",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected create to fail for empty name");
    }

    expect(result.error.message).toContain("name is required");
    expect(dbMocks.insertValuesMock).not.toHaveBeenCalled();
    expect(dbMocks.selectMock).not.toHaveBeenCalled();
  });

  it("create rejects color without hex format", async () => {
    const result = await deliveryPersonDrizzleRepository.create({
      name: "Carlos",
      color: "red",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected create to fail for invalid color");
    }

    expect(result.error.message).toContain("hex color");
    expect(dbMocks.insertValuesMock).not.toHaveBeenCalled();
  });

  it("create accepts 3-digit hex color", async () => {
    const generatedId = "b1c2d3e4-f5a6-7890-1234-567890abcdef";
    dbMocks.insertReturningMock.mockResolvedValueOnce([
      buildDeliveryPersonRow({ id: generatedId, color: "#FFF" }),
    ]);
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId);

    const result = await deliveryPersonDrizzleRepository.create({
      name: "Ana López",
      color: "#FFF",
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.color).toBe("#FFF");
  });

  // ─── list ─────────────────────────────────────────────────────────────────

  it("list returns only active delivery persons (filtered by deletedAt)", async () => {
    const active1 = buildDeliveryPersonRow({ id: "d1", name: "Carlos" });
    const active2 = buildDeliveryPersonRow({ id: "d2", name: "Ana" });

    dbMocks.selectMock.mockReturnValueOnce({
      from: () => ({
        where: vi.fn(() => Promise.resolve([active1, active2])),
        innerJoin: vi.fn(),
      }),
    });

    const result = await deliveryPersonDrizzleRepository.list();

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toHaveLength(2);
    expect(result.value[0]!.id).toBe("d1");
    expect(result.value[1]!.id).toBe("d2");
  });

  it("list returns empty array when no active delivery persons", async () => {
    dbMocks.selectMock.mockReturnValueOnce({
      from: () => ({
        where: vi.fn(() => Promise.resolve([])),
        innerJoin: vi.fn(),
      }),
    });

    const result = await deliveryPersonDrizzleRepository.list();

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toHaveLength(0);
  });

  // ─── findById ─────────────────────────────────────────────────────────────

  it("findById returns the delivery person when found", async () => {
    const row = buildDeliveryPersonRow({ id: "driver-99", name: "Pedro" });
    dbMocks.selectLimitMock.mockResolvedValueOnce([row]);

    const result = await deliveryPersonDrizzleRepository.findById("driver-99");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value.id).toBe("driver-99");
    expect(result.value.name).toBe("Pedro");
  });

  it("findById returns DeliveryPersonNotFoundError when not active", async () => {
    dbMocks.selectLimitMock.mockResolvedValueOnce([]);

    const result = await deliveryPersonDrizzleRepository.findById("missing-id");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected findById to fail for missing delivery person");
    }

    expect(result.error).toBeInstanceOf(DeliveryPersonNotFoundError);
  });

  // ─── update ───────────────────────────────────────────────────────────────

  it("update modifies name, color and phone successfully", async () => {
    const existingRow = buildDeliveryPersonRow({ id: "driver-1" });
    const updatedRow = buildDeliveryPersonRow({ id: "driver-1", name: "Carlos Updated", color: "#ABC123" });

    // findById call
    dbMocks.selectLimitMock.mockResolvedValueOnce([existingRow]);
    // update returning
    dbMocks.updateReturningMock.mockResolvedValueOnce([updatedRow]);

    const result = await deliveryPersonDrizzleRepository.update("driver-1", {
      name: "Carlos Updated",
      color: "#ABC123",
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value.name).toBe("Carlos Updated");
    expect(result.value.color).toBe("#ABC123");
  });

  it("update returns DeliveryPersonNotFoundError when driver does not exist", async () => {
    dbMocks.selectLimitMock.mockResolvedValueOnce([]);

    const result = await deliveryPersonDrizzleRepository.update("ghost-id", {
      name: "Ghost",
      color: "#000000",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected update to fail for missing delivery person");
    }

    expect(result.error).toBeInstanceOf(DeliveryPersonNotFoundError);
    expect(dbMocks.updateMock).not.toHaveBeenCalled();
  });

  it("update rejects invalid color", async () => {
    const result = await deliveryPersonDrizzleRepository.update("driver-1", {
      name: "Carlos",
      color: "notahex",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected update to fail for invalid color");
    }

    expect(result.error.message).toContain("hex color");
    expect(dbMocks.updateMock).not.toHaveBeenCalled();
  });

  // ─── archive ──────────────────────────────────────────────────────────────

  it("archive sets deletedAt (soft-delete) successfully", async () => {
    const existingRow = buildDeliveryPersonRow({ id: "driver-1" });

    // findById call
    dbMocks.selectLimitMock.mockResolvedValueOnce([existingRow]);
    // archive update returning
    dbMocks.updateReturningMock.mockResolvedValueOnce([{ id: "driver-1" }]);

    const result = await deliveryPersonDrizzleRepository.archive("driver-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toBeUndefined();
    expect(dbMocks.updateSetMock).toHaveBeenCalledTimes(1);
    const setArgs = dbMocks.updateSetMock.mock.calls[0]![0] as { deletedAt: Date; updatedAt: Date };
    expect(setArgs.deletedAt).toBeInstanceOf(Date);
    expect(setArgs.updatedAt).toBeInstanceOf(Date);
  });

  it("archive returns DeliveryPersonNotFoundError when driver does not exist", async () => {
    dbMocks.selectLimitMock.mockResolvedValueOnce([]);

    const result = await deliveryPersonDrizzleRepository.archive("ghost-id");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected archive to fail for missing delivery person");
    }

    expect(result.error).toBeInstanceOf(DeliveryPersonNotFoundError);
    expect(dbMocks.updateMock).not.toHaveBeenCalled();
  });

  // ─── getTodayCut ──────────────────────────────────────────────────────────

  it("getTodayCut aggregates orders by delivery person for today only", async () => {
    const cutRows = [
      { deliveryPersonId: "d1", name: "Carlos", color: "#FF5733", ordersCount: "5", totalSales: "50000" },
      { deliveryPersonId: "d2", name: "Ana", color: "#00AAFF", ordersCount: "3", totalSales: "30000" },
    ];

    dbMocks.selectGroupByMock.mockResolvedValueOnce(cutRows);

    const result = await deliveryPersonDrizzleRepository.getTodayCut();

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value.rows).toHaveLength(2);
    expect(result.value.rows[0]!.deliveryPersonId).toBe("d1");
    expect(result.value.rows[0]!.ordersCount).toBe(5);
    expect(result.value.rows[0]!.totalSales).toBe(50000);
    expect(result.value.rows[1]!.ordersCount).toBe(3);
    expect(result.value.rows[1]!.totalSales).toBe(30000);
    expect(result.value.totalOrders).toBe(8);
    expect(result.value.totalSales).toBe(80000);
    expect(result.value.generatedAt).toBeInstanceOf(Date);
  });

  it("getTodayCut returns empty cut when no orders today", async () => {
    dbMocks.selectGroupByMock.mockResolvedValueOnce([]);

    const result = await deliveryPersonDrizzleRepository.getTodayCut();

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value.rows).toHaveLength(0);
    expect(result.value.totalOrders).toBe(0);
    expect(result.value.totalSales).toBe(0);
  });

  it("getTodayCut includes archived delivery persons who worked today", async () => {
    // Even if a delivery person has deletedAt set, they appear in the cut
    // because the query does NOT filter by deletedAt on the delivery_persons side
    const cutRows = [
      {
        deliveryPersonId: "archived-driver",
        name: "Ex Repartidor",
        color: "#999999",
        ordersCount: "2",
        totalSales: "20000",
      },
    ];

    dbMocks.selectGroupByMock.mockResolvedValueOnce(cutRows);

    const result = await deliveryPersonDrizzleRepository.getTodayCut();

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value.rows).toHaveLength(1);
    expect(result.value.rows[0]!.deliveryPersonId).toBe("archived-driver");
    expect(result.value.totalOrders).toBe(2);
    expect(result.value.totalSales).toBe(20000);
  });

  it("getTodayCut coerces string numbers from the driver to proper numbers", async () => {
    // SQLite drivers may return aggregation results as strings
    const cutRows = [
      { deliveryPersonId: "d1", name: "Carlos", color: "#FF5733", ordersCount: "10", totalSales: "99999" },
    ];

    dbMocks.selectGroupByMock.mockResolvedValueOnce(cutRows);

    const result = await deliveryPersonDrizzleRepository.getTodayCut();

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    const row = result.value.rows[0]!;
    expect(typeof row.ordersCount).toBe("number");
    expect(typeof row.totalSales).toBe("number");
    expect(row.ordersCount).toBe(10);
    expect(row.totalSales).toBe(99999);
  });
});
