import type { Category } from "@/modules/menu/domain/category";
import type {
  ModifierGroup,
  ModifierOption,
  SelectedModifier,
} from "@/modules/menu/domain/modifier-group";
import type { Product } from "@/modules/menu/domain/product";

const FIXED_DATE = new Date("2026-01-01T00:00:00.000Z");

export function buildProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod-1",
    categoryId: "cat-1",
    menuIds: ["menu-1"],
    name: "Café",
    description: "Café caliente",
    price: 5000,
    prepTimeMinutes: 5,
    image: "☕",
    isPopular: false,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
    ...overrides,
  };
}

export function buildCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-1",
    name: "Bebidas",
    description: "Bebidas frías y calientes",
    color: null,
    menuId: null,
    printerId: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
    ...overrides,
  };
}

export function buildModifierOption(overrides: Partial<ModifierOption> = {}): ModifierOption {
  return {
    id: "opt-1",
    groupId: "grp-1",
    name: "Sin hielo",
    priceDelta: 0,
    isDefault: true,
    sortOrder: 0,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
    ...overrides,
  };
}

export function buildModifierGroup(overrides: Partial<ModifierGroup> = {}): ModifierGroup {
  return {
    id: "grp-1",
    name: "Nivel de hielo",
    type: "single",
    required: false,
    sortOrder: 0,
    firstOptionFree: false,
    options: [],
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    deletedAt: null,
    ...overrides,
  };
}

export function buildSelectedModifier(overrides: Partial<SelectedModifier> = {}): SelectedModifier {
  return {
    groupId: "grp-1",
    groupName: "Nivel de hielo",
    optionId: "opt-1",
    optionName: "Sin hielo",
    priceDelta: 0,
    textValue: null,
    ...overrides,
  };
}
