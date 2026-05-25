import type { ResultAsync } from "neverthrow";

import type { Category } from "@/features/menu/domain/category";
import type { MenuDomainError } from "@/features/menu/domain/errors";
import type { CategoryRepository } from "@/features/menu/domain/ports";

export function listCategories(
  repository: CategoryRepository,
): ResultAsync<Category[], MenuDomainError> {
  return repository.list();
}
