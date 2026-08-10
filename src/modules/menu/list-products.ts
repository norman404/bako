import type { ResultAsync } from "neverthrow";

import type { MenuDomainError } from "./errors";
import type { ProductRepository } from "./ports";
import type { Product } from "./product";

export function listProducts(
  repository: ProductRepository,
  menuIds?: string[],
): ResultAsync<Product[], MenuDomainError> {
  return repository.list(menuIds);
}
