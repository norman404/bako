import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductUpsertInput } from "@/features/menu/domain/ports";
import type { ProductRow } from "@/shared/infrastructure/db/schema";

const dbMocks = vi.hoisted(() => {
  const selectLimitMock = vi.fn<() => Promise<ProductRow[]>>();
  const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock }));
  const selectFromMock = vi.fn(() => ({ where: selectWhereMock }));
  const selectMock = vi.fn(() => ({ from: selectFromMock }));

  const insertReturningMock = vi.fn<() => Promise<ProductRow[]>>();
  const insertValuesMock = vi.fn<(values: Partial<ProductRow>) => { returning: typeof insertReturningMock }>(
    () => ({ returning: insertReturningMock }),
  );
  const insertMock = vi.fn(() => ({ values: insertValuesMock }));

  const updateReturningMock = vi.fn<() => Promise<ProductRow[]>>();
  const updateWhereMock = vi.fn(() => ({ returning: updateReturningMock }));
  const updateSetMock = vi.fn<(values: Partial<ProductRow>) => { where: typeof updateWhereMock }>(
    () => ({ where: updateWhereMock }),
  );
  const updateMock = vi.fn(() => ({ set: updateSetMock }));

  return {
    selectLimitMock,
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

vi.mock("@/shared/infrastructure/db/client", () => ({
  db: {
    select: dbMocks.selectMock,
    insert: dbMocks.insertMock,
    update: dbMocks.updateMock,
  },
}));

import { ProductNotFoundError } from "@/features/menu/domain/errors";
import { productDrizzleRepository } from "@/features/menu/persistence/product-drizzle.repository";

const validInput: ProductUpsertInput = {
  categoryId: "category-1",
  name: "Flat White",
  description: "Espresso + milk",
  price: 2500,
  prepTimeMinutes: 4,
  image: "☕",
  isPopular: true,
};

function buildProductRow(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id: overrides.id ?? "product-1",
    categoryId: overrides.categoryId ?? "category-1",
    name: overrides.name ?? "Flat White",
    description: overrides.description ?? "Espresso + milk",
    price: overrides.price ?? 2500,
    prepTimeMinutes: overrides.prepTimeMinutes ?? 4,
    image: overrides.image ?? "☕",
    isPopular: overrides.isPopular ?? true,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T10:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T10:00:00.000Z"),
    deletedAt: overrides.deletedAt ?? null,
  };
}

describe("productDrizzleRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.insertReturningMock.mockResolvedValue([]);
    dbMocks.updateReturningMock.mockResolvedValue([]);
  });

  it("create generates a UUID id and persists integer price", async () => {
    const generatedId = "8dc50e6f-6e6f-4d2c-a6f6-8d19f6f49885";
    const createdRow = buildProductRow({ id: generatedId, price: validInput.price });

    dbMocks.insertReturningMock.mockResolvedValueOnce([createdRow]);
    const randomUuidSpy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId);

    const result = await productDrizzleRepository.create(validInput);

    expect(randomUuidSpy).toHaveBeenCalledTimes(1);
    expect(dbMocks.insertValuesMock).toHaveBeenCalledTimes(1);
    expect(dbMocks.insertReturningMock).toHaveBeenCalledTimes(1);

    const inserted = dbMocks.insertValuesMock.mock.calls[0]![0] as ProductRow;
    expect(inserted.id).toBe(generatedId);
    expect(inserted.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(inserted.price).toBe(validInput.price);
    expect("deletedAt" in inserted).toBe(false);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.id).toBe(generatedId);
    expect(result.value.price).toBe(validInput.price);
  });

  it("create rejects non-integer price", async () => {
    const result = await productDrizzleRepository.create({
      ...validInput,
      price: 25.5,
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected create to fail for non-integer price");
    }

    expect(result.error.message).toContain("non-negative integer");
    expect(dbMocks.insertValuesMock).not.toHaveBeenCalled();
    expect(dbMocks.selectMock).not.toHaveBeenCalled();
  });

  it("update rejects non-integer price", async () => {
    const result = await productDrizzleRepository.update("product-1", {
      ...validInput,
      price: 12.34,
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected update to fail for non-integer price");
    }

    expect(result.error.message).toContain("non-negative integer");
    expect(dbMocks.updateSetMock).not.toHaveBeenCalled();
    expect(dbMocks.selectMock).not.toHaveBeenCalled();
  });

  it("archive performs soft delete by setting deletedAt instead of removing rows", async () => {
    dbMocks.updateReturningMock.mockResolvedValueOnce([buildProductRow({ id: "product-1" })]);

    const result = await productDrizzleRepository.archive("product-1");

    expect(result.isOk()).toBe(true);
    expect(dbMocks.updateSetMock).toHaveBeenCalledTimes(1);
    expect(dbMocks.updateWhereMock).toHaveBeenCalledTimes(1);
    expect(dbMocks.insertValuesMock).not.toHaveBeenCalled();

    const archivePatch = dbMocks.updateSetMock.mock.calls[0]![0] as {
      deletedAt?: Date | null;
      updatedAt?: Date;
    };

    expect(archivePatch.deletedAt).toBeInstanceOf(Date);
    expect(archivePatch.updatedAt).toBeInstanceOf(Date);
  });

  it("archive returns ProductNotFoundError when product is not active", async () => {
    dbMocks.updateReturningMock.mockResolvedValueOnce([]);

    const result = await productDrizzleRepository.archive("missing-id");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected archive to fail for missing product");
    }

    expect(result.error).toBeInstanceOf(ProductNotFoundError);
    expect(dbMocks.updateSetMock).toHaveBeenCalledTimes(1);
    expect(dbMocks.updateWhereMock).toHaveBeenCalledTimes(1);
  });
});
