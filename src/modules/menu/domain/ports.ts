import type { ResultAsync } from "neverthrow";

import type { Category } from "@/modules/menu/domain/category";
import type { MenuDomainError } from "@/modules/menu/domain/errors";
import type { Menu } from "@/modules/menu/domain/menu";
import type {
  ModifierGroup,
  ModifierGroupType,
} from "@/modules/menu/domain/modifier-group";
import type { Product } from "@/modules/menu/domain/product";

export interface ProductUpsertInput {
  categoryId: string;
  menuIds: string[];
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
  color?: string | null;
  menuId?: string | null;
}

export interface MenuCreateInput {
  name: string;
  isDefault?: boolean;
}

export interface ProductRepository {
  list(menuIds?: string[]): ResultAsync<Product[], MenuDomainError>;
  findById(id: string): ResultAsync<Product, MenuDomainError>;
  create(input: ProductUpsertInput): ResultAsync<Product, MenuDomainError>;
  update(id: string, input: ProductUpsertInput): ResultAsync<Product, MenuDomainError>;
  archive(id: string): ResultAsync<void, MenuDomainError>;
}

export interface CategoryRepository {
  list(menuId?: string): ResultAsync<Category[], MenuDomainError>;
  findById(id: string): ResultAsync<Category, MenuDomainError>;
  create(input: CategoryCreateInput): ResultAsync<Category, MenuDomainError>;
  update(id: string, input: CategoryCreateInput): ResultAsync<Category, MenuDomainError>;
  archive(id: string): ResultAsync<void, MenuDomainError>;
}

export interface MenuRepository {
  list(): ResultAsync<Menu[], MenuDomainError>;
  create(input: MenuCreateInput): ResultAsync<Menu, MenuDomainError>;
  update(id: string, input: MenuCreateInput): ResultAsync<Menu, MenuDomainError>;
  delete(id: string): ResultAsync<void, MenuDomainError>;
}

export interface ModifierOptionInput {
  id?: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
  sortOrder: number;
}

export interface ModifierGroupUpsertInput {
  name: string;
  type: ModifierGroupType;
  required: boolean;
  sortOrder: number;
  options: ModifierOptionInput[];
}

export interface ModifierAssignmentInput {
  groupId: string;
  categoryId?: string | null;
  productId?: string | null;
}

export interface ModifierGroupRepository {
  list(): ResultAsync<ModifierGroup[], MenuDomainError>;
  findById(id: string): ResultAsync<ModifierGroup, MenuDomainError>;
  create(input: ModifierGroupUpsertInput): ResultAsync<ModifierGroup, MenuDomainError>;
  update(id: string, input: ModifierGroupUpsertInput): ResultAsync<ModifierGroup, MenuDomainError>;
  archive(id: string): ResultAsync<void, MenuDomainError>;
  assign(input: ModifierAssignmentInput): ResultAsync<void, MenuDomainError>;
  unassign(input: ModifierAssignmentInput): ResultAsync<void, MenuDomainError>;
  listByCategory(categoryId: string): ResultAsync<ModifierGroup[], MenuDomainError>;
  listByProduct(productId: string): ResultAsync<ModifierGroup[], MenuDomainError>;
  /**
   * Batch variant of {@link listByCategory}: returns a Map<categoryId, ModifierGroup[]>
   * for every categoryId in `categoryIds`. Missing categories map to an empty array.
   * Used to power the product grid without N+1 queries.
   */
  listByCategoryIds(
    categoryIds: string[],
  ): ResultAsync<Map<string, ModifierGroup[]>, MenuDomainError>;
  /**
   * Batch variant of {@link listByProduct}: returns a Map<productId, ModifierGroup[]>
   * for every productId in `productIds`. Missing products map to an empty array.
   */
  listByProductIds(
    productIds: string[],
  ): ResultAsync<Map<string, ModifierGroup[]>, MenuDomainError>;
  /**
   * Returns a map of categoryId → Set<groupId> of every category↔group
   * assignment currently active in the system. Used by the admin panel to
   * render the assignment section with pre-checked state.
   */
  listCategoryAssignments(): ResultAsync<Map<string, Set<string>>, MenuDomainError>;
  /**
   * Returns a map of productId → Set<groupId> of every product↔group
   * assignment currently active in the system. Used by the admin panel to
   * render the assignment section with pre-checked state.
   */
  listProductAssignments(): ResultAsync<Map<string, Set<string>>, MenuDomainError>;
}
