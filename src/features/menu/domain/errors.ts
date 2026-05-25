export class MenuDomainError extends Error {
  readonly kind = "MenuDomainError";
}

export class ProductNotFoundError extends MenuDomainError {
  constructor(productId: string) {
    super(`Product not found: ${productId}`);
  }
}

export class CategoryNotFoundError extends MenuDomainError {
  constructor(categoryId: string) {
    super(`Category not found: ${categoryId}`);
  }
}
