import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductUpsertInput } from "@/modules/menu/domain/ports";
import type { ProductMenuRow, ProductRow } from "@/shared/db/schema";

const dbMocks = vi.hoisted(() => {
  const selectLimitMock = vi.fn<any>(() => Promise.resolve([]));
  const selectWhereMock = vi.fn<any>(() => ({ limit: selectLimitMock }));
  const selectFromMock = vi.fn<any>(() => ({ where: selectWhereMock }));
  const selectMock = vi.fn<any>(() => ({ from: selectFromMock }));

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

  const deleteWhereMock = vi.fn(() => Promise.resolve());
  const deleteMock = vi.fn(() => ({ where: deleteWhereMock }));

  return {
    selectLimitMock,
    selectWhereMock,
    selectFromMock,
    selectMock,
    insertReturningMock,
    insertValuesMock,
    insertMock,
    updateReturningMock,
    updateWhereMock,
    updateSetMock,
    updateMock,
    deleteWhereMock,
    deleteMock,
  };
});

vi.mock("@/shared/db/client", () => ({
  db: {
    select: dbMocks.selectMock,
    insert: dbMocks.insertMock,
    update: dbMocks.updateMock,
    delete: dbMocks.deleteMock,
  },
}));

import { ProductNotFoundError } from "@/modules/menu/domain/errors";
import { productDrizzleRepository } from "@/modules/menu/persistence/product-drizzle.repository";

const validInput: ProductUpsertInput = {
  categoryId: "category-1",
  menuIds: ["menu-1"],
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
    menuId: overrides.menuId ?? null,
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
    dbMocks.insertValuesMock.mockReturnValueOnce({ returning: dbMocks.insertReturningMock });
    const randomUuidSpy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId);

    const result = await productDrizzleRepository.create(validInput);

    expect(randomUuidSpy).toHaveBeenCalledTimes(1);
    expect(dbMocks.insertValuesMock).toHaveBeenCalledTimes(2); // products + productMenus
    expect(dbMocks.insertReturningMock).toHaveBeenCalledTimes(1);

    const insertedProduct = dbMocks.insertValuesMock.mock.calls[0]![0] as ProductRow;
    expect(insertedProduct.id).toBe(generatedId);
    expect(insertedProduct.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(insertedProduct.price).toBe(validInput.price);
    expect("menuId" in insertedProduct).toBe(false); // menuId should NOT be in insert

    // Verify productMenus insert
    const insertedProductMenus = dbMocks.insertValuesMock.mock.calls[1]![0] as Array<{
      productId: string;
      menuId: string;
    }>;
    expect(insertedProductMenus).toEqual([{ productId: generatedId, menuId: "menu-1" }]);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.id).toBe(generatedId);
    expect(result.value.price).toBe(validInput.price);
    expect(result.value.menuIds).toEqual(["menu-1"]);
  });

  it("create rejects empty menuIds array", async () => {
    const result = await productDrizzleRepository.create({
      ...validInput,
      menuIds: [],
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected create to fail for empty menuIds");
    }

    expect(result.error.message).toContain("must belong to at least one menu");
    expect(dbMocks.insertValuesMock).not.toHaveBeenCalled();
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

  it("list() without menuIds returns all products with their menuIds", async () => {
    const product1 = buildProductRow({ id: "product-1" });
    const product2 = buildProductRow({ id: "product-2", name: "Cappuccino" });

    // Mock: db.select().from(products).where(isNull(products.deletedAt))
    dbMocks.selectWhereMock.mockResolvedValueOnce([product1, product2]);

    // Mock: db.select().from(productMenus).where(inArray(...))
    const productMenuRows: ProductMenuRow[] = [
      { productId: "product-1", menuId: "menu-1" },
      { productId: "product-1", menuId: "menu-2" },
      { productId: "product-2", menuId: "menu-1" },
    ];
    dbMocks.selectWhereMock.mockResolvedValueOnce(productMenuRows);

    const result = await productDrizzleRepository.list();

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toHaveLength(2);
    expect(result.value[0]!.id).toBe("product-1");
    expect(result.value[0]!.menuIds).toEqual(["menu-1", "menu-2"]);
    expect(result.value[1]!.id).toBe("product-2");
    expect(result.value[1]!.menuIds).toEqual(["menu-1"]);
  });

  it("list(menuIds) filters products by menu", async () => {
    const product1 = buildProductRow({ id: "product-1" });

    // Mock: db.select().from(productMenus).where(inArray(productMenus.menuId, menuIds))
    dbMocks.selectWhereMock.mockResolvedValueOnce([{ productId: "product-1" }]);

    // Mock: db.select().from(products).where(and(...))
    dbMocks.selectWhereMock.mockResolvedValueOnce([product1]);

    // Mock: db.select().from(productMenus).where(inArray(productMenus.productId, productIds))
    const productMenuRows: ProductMenuRow[] = [
      { productId: "product-1", menuId: "menu-1" },
      { productId: "product-1", menuId: "menu-2" },
    ];
    dbMocks.selectWhereMock.mockResolvedValueOnce(productMenuRows);

    const result = await productDrizzleRepository.list(["menu-1"]);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toHaveLength(1);
    expect(result.value[0]!.id).toBe("product-1");
    expect(result.value[0]!.menuIds).toEqual(["menu-1", "menu-2"]);
  });

  it("findById returns product with menuIds", async () => {
    const product = buildProductRow({ id: "product-1" });
    const productMenuRows = [{ menuId: "menu-1" }, { menuId: "menu-2" }];

    // First query: db.select().from(products).where(...).limit(1)
    const selectWhereMock1 = vi.fn(() => ({ limit: vi.fn(() => Promise.resolve([product])) }));
    const selectFromMock1 = vi.fn(() => ({ where: selectWhereMock1 }));

    // Second query: db.select({ menuId }).from(productMenus).where(...)
    const selectWhereMock2 = vi.fn(() => Promise.resolve(productMenuRows));
    const selectFromMock2 = vi.fn(() => ({ where: selectWhereMock2 }));

    // Setup selectMock to return different chains
    dbMocks.selectMock.mockReturnValueOnce({ from: selectFromMock1 } as never);
    dbMocks.selectMock.mockReturnValueOnce({ from: selectFromMock2 } as never);

    const result = await productDrizzleRepository.findById("product-1");

    if (result.isErr()) {
      console.error("findById error:", result.error);
      throw result.error;
    }

    expect(result.isOk()).toBe(true);
    expect(result.value.id).toBe("product-1");
    expect(result.value.menuIds).toEqual(["menu-1", "menu-2"]);
  });

  it("update deletes old and inserts new productMenus", async () => {
    const updatedRow = buildProductRow({ id: "product-1", price: 3000 });

    dbMocks.updateReturningMock.mockResolvedValueOnce([updatedRow]);
    dbMocks.deleteWhereMock.mockResolvedValueOnce(undefined as never);

    const result = await productDrizzleRepository.update("product-1", {
      ...validInput,
      price: 3000,
      menuIds: ["menu-2", "menu-3"],
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    // Verify delete was called
    expect(dbMocks.deleteMock).toHaveBeenCalledTimes(1);
    expect(dbMocks.deleteWhereMock).toHaveBeenCalledTimes(1);

    // Verify insert was called for new productMenus
    expect(dbMocks.insertValuesMock).toHaveBeenCalledTimes(1);
    const insertedProductMenus = dbMocks.insertValuesMock.mock.calls[0]![0] as Array<{
      productId: string;
      menuId: string;
    }>;
    expect(insertedProductMenus).toEqual([
      { productId: "product-1", menuId: "menu-2" },
      { productId: "product-1", menuId: "menu-3" },
    ]);

    expect(result.value.menuIds).toEqual(["menu-2", "menu-3"]);
  });
});
