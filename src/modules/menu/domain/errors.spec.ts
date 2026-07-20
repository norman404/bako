import { describe, expect, it } from "bun:test";

import {
  CategoryNotFoundError,
  MenuDomainError,
  MenuNotFoundError,
  ModifierGroupNotFoundError,
  ModifierOptionNotFoundError,
  ProductNotFoundError,
} from "./errors";

describe("menu domain errors", () => {
  it("ProductNotFoundError carries a translatable code and params", () => {
    const error = new ProductNotFoundError("prod-123");

    expect(error).toBeInstanceOf(MenuDomainError);
    expect(error.code).toBe("productNotFound");
    expect(error.params).toEqual({ productId: "prod-123" });
    expect(error.message).toContain("prod-123");
  });

  it("CategoryNotFoundError carries a translatable code and params", () => {
    const error = new CategoryNotFoundError("cat-123");

    expect(error).toBeInstanceOf(MenuDomainError);
    expect(error.code).toBe("categoryNotFound");
    expect(error.params).toEqual({ categoryId: "cat-123" });
  });

  it("MenuNotFoundError carries a translatable code and params", () => {
    const error = new MenuNotFoundError("menu-123");

    expect(error).toBeInstanceOf(MenuDomainError);
    expect(error.code).toBe("menuNotFound");
    expect(error.params).toEqual({ menuId: "menu-123" });
  });

  it("ModifierGroupNotFoundError carries a translatable code and params", () => {
    const error = new ModifierGroupNotFoundError("group-123");

    expect(error).toBeInstanceOf(MenuDomainError);
    expect(error.code).toBe("modifierGroupNotFound");
    expect(error.params).toEqual({ groupId: "group-123" });
  });

  it("ModifierOptionNotFoundError carries a translatable code and params", () => {
    const error = new ModifierOptionNotFoundError("opt-123");

    expect(error).toBeInstanceOf(MenuDomainError);
    expect(error.code).toBe("modifierOptionNotFound");
    expect(error.params).toEqual({ optionId: "opt-123" });
  });

  it("generic MenuDomainError does not expose a translatable code", () => {
    const error = new MenuDomainError("Something went wrong");

    expect("code" in error).toBe(false);
    expect("params" in error).toBe(false);
  });
});
