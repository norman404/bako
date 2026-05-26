import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CategoryCreateInput } from "@/modules/menu/domain/ports";
import type { CategoryRow } from "@/shared/db/schema";

const dbMocks = vi.hoisted(() => {
  const selectLimitMock = vi.fn<() => Promise<CategoryRow[]>>();
  const selectWhereMock = vi.fn(() => ({ limit: selectLimitMock }));
  const selectOrderByMock = vi.fn(() => ({ where: selectWhereMock }));
  const selectMock = vi.fn(() => ({ from: () => ({ where: selectWhereMock, orderBy: selectOrderByMock }) }));

  const insertReturningMock = vi.fn<() => Promise<CategoryRow[]>>();
  const insertValuesMock = vi.fn<(values: Partial<CategoryRow>) => { returning: typeof insertReturningMock }>(
    () => ({ returning: insertReturningMock }),
  );
  const insertMock = vi.fn(() => ({ values: insertValuesMock }));

  return {
    selectLimitMock,
    selectMock,
    insertReturningMock,
    insertValuesMock,
    insertMock,
  };
});

vi.mock("@/shared/db/client", () => ({
  db: {
    select: dbMocks.selectMock,
    insert: dbMocks.insertMock,
  },
}));

import { CategoryNotFoundError } from "@/modules/menu/domain/errors";
import { categoryDrizzleRepository } from "@/modules/menu/persistence/category-drizzle.repository";

const validInput: CategoryCreateInput = {
  name: "Bebidas calientes",
  description: "Café, tés y chocolate",
};

function buildCategoryRow(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: overrides.id ?? "category-1",
    name: overrides.name ?? "Bebidas calientes",
    description: overrides.description ?? "Café, tés y chocolate",
    color: overrides.color ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T10:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T10:00:00.000Z"),
    deletedAt: overrides.deletedAt ?? null,
  };
}

describe("categoryDrizzleRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.insertReturningMock.mockResolvedValue([]);
  });

  it("create generates a UUID id and persists trimmed values", async () => {
    const generatedId = "a7f5d5d8-9d8b-45ed-8d80-6c0d6a1c6f6a";
    dbMocks.insertReturningMock.mockResolvedValueOnce([buildCategoryRow({ id: generatedId })]);
    const randomUuidSpy = vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(generatedId);

    const result = await categoryDrizzleRepository.create({
      name: `  ${validInput.name}  `,
      description: `  ${validInput.description}  `,
    });

    expect(randomUuidSpy).toHaveBeenCalledTimes(1);
    expect(dbMocks.insertValuesMock).toHaveBeenCalledTimes(1);
    expect(dbMocks.insertReturningMock).toHaveBeenCalledTimes(1);

    const inserted = dbMocks.insertValuesMock.mock.calls[0]![0] as CategoryRow;
    expect(inserted.id).toBe(generatedId);
    expect(inserted.name).toBe(validInput.name);
    expect(inserted.description).toBe(validInput.description);
    expect("deletedAt" in inserted).toBe(false);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }
    expect(result.value.id).toBe(generatedId);
    expect(result.value.name).toBe(validInput.name);
  });

  it("create rejects empty name", async () => {
    const result = await categoryDrizzleRepository.create({
      name: "   ",
      description: validInput.description,
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected create to fail for empty name");
    }

    expect(result.error.message).toContain("name is required");
    expect(dbMocks.insertValuesMock).not.toHaveBeenCalled();
    expect(dbMocks.selectMock).not.toHaveBeenCalled();
  });

  it("findById returns CategoryNotFoundError when category is not active", async () => {
    dbMocks.selectLimitMock.mockResolvedValueOnce([]);

    const result = await categoryDrizzleRepository.findById("missing-id");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected findById to fail for missing category");
    }

    expect(result.error).toBeInstanceOf(CategoryNotFoundError);
  });
});
