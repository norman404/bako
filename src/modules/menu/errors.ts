export interface MenuTranslatableError {
  readonly code: string;
  readonly params?: Record<string, unknown>;
}

export class MenuDomainError extends Error {
  readonly kind = "MenuDomainError";
}

export class ProductNotFoundError extends MenuDomainError implements MenuTranslatableError {
  readonly code = "productNotFound" as const;
  readonly params: { productId: string };

  constructor(productId: string) {
    super(`Product not found: ${productId}`);
    this.params = { productId };
  }
}

export class CategoryNotFoundError extends MenuDomainError implements MenuTranslatableError {
  readonly code = "categoryNotFound" as const;
  readonly params: { categoryId: string };

  constructor(categoryId: string) {
    super(`Category not found: ${categoryId}`);
    this.params = { categoryId };
  }
}

export class ModifierGroupNotFoundError extends MenuDomainError implements MenuTranslatableError {
  readonly code = "modifierGroupNotFound" as const;
  readonly params: { groupId: string };

  constructor(groupId: string) {
    super(`Modifier group not found: ${groupId}`);
    this.params = { groupId };
  }
}
