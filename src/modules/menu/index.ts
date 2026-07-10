export { ProductGrid } from './components/ProductGrid'
export { CategoryNav } from './components/CategoryNav'
export { ProductSearch } from './components/ProductSearch'
export { ProductCustomizationDialog } from './components/ProductCustomizationDialog'
export type { ProductCustomizationDialogProps } from './components/ProductCustomizationDialog'
export { ModifierGroupSettingsPanel } from './components/admin/ModifierGroupSettingsPanel'

// Domain
export type { Menu } from './domain/menu'
export type { Category } from './domain/category'
export type { Product } from './domain/product'
export type {
  ModifierGroup,
  ModifierOption,
  ModifierGroupType,
  SelectedModifier,
  CartItemModifier,
} from './domain/modifier-group'
export {
  resolveProductModifierGroups,
  buildCartItemKey,
} from './domain/modifier-group'
export type { MenuCreateInput, CategoryCreateInput, ProductUpsertInput, ModifierGroupUpsertInput, ModifierOptionInput, ModifierAssignmentInput } from './domain/ports'
export { MenuDomainError, MenuNotFoundError, CategoryNotFoundError, ProductNotFoundError, ModifierGroupNotFoundError, ModifierOptionNotFoundError } from './domain/errors'

// Hooks
export { useMenus, useCreateMenu } from './hooks/use-menus'
export { useCategories, useCreateCategory, useUpdateCategory, useArchiveCategory } from './hooks/use-categories'
export { useProducts, useCreateProduct, useUpdateProduct, useArchiveProduct } from './hooks/use-products'
export { useFilteredProducts } from './hooks/use-filtered-products'
export {
  useModifierGroups,
  useCreateModifierGroup,
  useUpdateModifierGroup,
  useArchiveModifierGroup,
  useAssignModifierGroup,
  useProductModifierGroups,
  useProductModifierGroupsMap,
  MENU_MODIFIER_GROUPS_QUERY_KEY,
} from './hooks/use-modifier-groups'

// Lib
export { calculateItemUnitPrice } from './lib/modifier-price'

// Store
export { useMenuStore } from './store/menu-store'

// Manifest
export {
  productsManifest,
  categoriesManifest,
  menusManifest,
  modifierGroupsManifest,
} from './manifest'
