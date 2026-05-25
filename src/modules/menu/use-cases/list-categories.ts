import type { ResultAsync } from "neverthrow";

import type { Category } from "@/modules/menu/domain/category";
import type { MenuDomainError } from "@/modules/menu/domain/errors";
import type { CategoryRepository } from "@/modules/menu/domain/ports";

export function listCategories(
  repository: CategoryRepository,
): ResultAsync<Category[], MenuDomainError> {
  return repository.list();
}
