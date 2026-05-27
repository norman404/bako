import { describe, expect, it } from "vitest";
import { errAsync, okAsync } from "neverthrow";

import type { Category } from "@/modules/menu/domain/category";
import { MenuDomainError } from "@/modules/menu/domain/errors";
import type { CategoryRepository } from "@/modules/menu/domain/ports";
import { listCategories } from "@/modules/menu/use-cases/list-categories";

function buildCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: overrides.id ?? "category-1",
    name: overrides.name ?? "Bebidas calientes",
    description: overrides.description ?? "Café, tés y chocolate",
    color: overrides.color ?? null,
    menuId: overrides.menuId ?? null,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T10:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T10:00:00.000Z"),
    deletedAt: overrides.deletedAt ?? null,
  };
}

describe("listCategories", () => {
  it("delegates to repository.list() without menuId", async () => {
    const mockCategories = [buildCategory({ id: "c1" }), buildCategory({ id: "c2" })];
    const mockRepository: CategoryRepository = {
      list: () => okAsync(mockCategories),
    } as CategoryRepository;

    const result = await listCategories(mockRepository);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toEqual(mockCategories);
  });

  it("delegates to repository.list(menuId) when menuId provided", async () => {
    const mockCategories = [buildCategory({ id: "c1", menuId: "menu-1" })];
    const mockRepository: CategoryRepository = {
      list: (menuId?: string) => {
        expect(menuId).toBe("menu-1");
        return okAsync(mockCategories);
      },
    } as CategoryRepository;

    const result = await listCategories(mockRepository, "menu-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toEqual(mockCategories);
  });

  it("propagates repository errors", async () => {
    const mockError = new MenuDomainError("Database connection failed");
    const mockRepository: CategoryRepository = {
      list: () => errAsync(mockError),
    } as CategoryRepository;

    const result = await listCategories(mockRepository);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected listCategories to fail");
    }

    expect(result.error).toBe(mockError);
  });
});
