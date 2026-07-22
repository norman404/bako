import { describe, expect, it } from "bun:test";
import { errAsync, okAsync } from "neverthrow";

import { MenuDomainError } from "@/modules/menu/domain/errors";
import type { ProductRepository } from "@/modules/menu/domain/ports";
import { listProducts } from "@/modules/menu/use-cases/list-products";
import { buildProduct } from "@/modules/menu/test/factories";

describe("listProducts", () => {
  it("delegates to repository.list() without menuIds", async () => {
    const mockProducts = [buildProduct({ id: "p1" }), buildProduct({ id: "p2" })];
    const mockRepository: ProductRepository = {
      list: () => okAsync(mockProducts),
    } as ProductRepository;

    const result = await listProducts(mockRepository);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toEqual(mockProducts);
  });

  it("delegates to repository.list(menuIds) when menuIds provided", async () => {
    const mockProducts = [buildProduct({ id: "p1", menuIds: ["menu-1"] })];
    const mockRepository: ProductRepository = {
      list: (menuIds?: string[]) => {
        expect(menuIds).toEqual(["menu-1"]);
        return okAsync(mockProducts);
      },
    } as ProductRepository;

    const result = await listProducts(mockRepository, ["menu-1"]);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw result.error;
    }

    expect(result.value).toEqual(mockProducts);
  });

  it("propagates repository errors", async () => {
    const mockError = new MenuDomainError("Database connection failed");
    const mockRepository: ProductRepository = {
      list: () => errAsync(mockError),
    } as ProductRepository;

    const result = await listProducts(mockRepository);

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected listProducts to fail");
    }

    expect(result.error).toBe(mockError);
  });
});
