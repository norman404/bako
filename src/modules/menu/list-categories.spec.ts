import { describe, expect, it } from "bun:test";
import { errAsync, okAsync } from "neverthrow";

import { MenuDomainError } from "./errors";
import type { CategoryRepository } from "./ports";
import { listCategories } from "./list-categories";
import { buildCategory } from "./test/factories";

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
