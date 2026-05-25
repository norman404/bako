import type { ResultAsync } from "neverthrow";

import type { Category } from "@/modules/menu/domain/category";
import type { MenuDomainError } from "@/modules/menu/domain/errors";
import type { Product } from "@/modules/menu/domain/product";

export interface ProductUpsertInput {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  prepTimeMinutes: number;
  image: string;
  isPopular: boolean;
}

export interface CategoryCreateInput {
  name: string;
  description: string;
}

export interface ProductRepository {
  list(): ResultAsync<Product[], MenuDomainError>;
  findById(id: string): ResultAsync<Product, MenuDomainError>;
  create(input: ProductUpsertInput): ResultAsync<Product, MenuDomainError>;
  update(id: string, input: ProductUpsertInput): ResultAsync<Product, MenuDomainError>;
  archive(id: string): ResultAsync<void, MenuDomainError>;
}

export interface CategoryRepository {
  list(): ResultAsync<Category[], MenuDomainError>;
  findById(id: string): ResultAsync<Category, MenuDomainError>;
  create(input: CategoryCreateInput): ResultAsync<Category, MenuDomainError>;
  update(id: string, input: CategoryCreateInput): ResultAsync<Category, MenuDomainError>;
  archive(id: string): ResultAsync<void, MenuDomainError>;
}
