import type { ResultAsync } from "neverthrow";

import type { MenuDomainError } from "@/modules/menu/domain/errors";
import type { ProductRepository } from "@/modules/menu/domain/ports";
import type { Product } from "@/modules/menu/domain/product";

export function listProducts(
  repository: ProductRepository,
): ResultAsync<Product[], MenuDomainError> {
  return repository.list();
}
