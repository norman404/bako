import type { ResultAsync } from "neverthrow";

import type { MenuDomainError } from "@/features/menu/domain/errors";
import type { ProductRepository } from "@/features/menu/domain/ports";
import type { Product } from "@/features/menu/domain/product";

export function listProducts(
  repository: ProductRepository,
): ResultAsync<Product[], MenuDomainError> {
  return repository.list();
}
