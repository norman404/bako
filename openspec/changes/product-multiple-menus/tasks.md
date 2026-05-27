# Tasks: Product Multiple Menus

## Phase 1: Foundation (DB + Schema + Domain)

- [ ] 1.1 Create `src-tauri/migrations/0009_product_menus.sql` — junction table, index, data migration (Spec: product-menu-many-to-many/spec.md:15-17, 70-74)
- [ ] 1.2 Register migration 9 in `src-tauri/src/lib.rs:56` (design.md:84)
- [ ] 1.3 Add `productMenus` table to `src/shared/db/schema.ts:26`, mark `products.menuId` deprecated (design.md:85, spec: product-menu-many-to-many/spec.md:82-87)
- [ ] 1.4 Update `src/modules/menu/domain/product.ts:4` — change `menuId: string | null` → `menuIds: string[]` (design.md:88, spec: product-management/spec.md:98-107)
- [ ] 1.5 Update `src/modules/menu/domain/ports.ts:8-17` — `ProductUpsertInput.menuId` → `menuIds: string[]` (design.md:89)
- [ ] 1.6 Update `src/modules/menu/domain/ports.ts:31-38` — `ProductRepository.list(menuIds?: string[])`, remove `listByMenuId()` (design.md:90)
- [ ] 1.7 Update `src/modules/menu/domain/ports.ts:40-47` — `CategoryRepository.list(menuId?: string)`, remove `listByMenuId()` (design.md:91)

## Phase 2: Core Implementation (Persistence + Use-Cases)

### 2.1 Test Phase (TDD Red)

- [ ] 2.1.1 Write test: `productDrizzleRepository.create()` inserts junction rows (spec: product-menu-many-to-many/spec.md:44-49, design.md:275-283)
- [ ] 2.1.2 Write test: `productDrizzleRepository.list(menuIds)` filters via JOIN (spec: menu-scoped-queries/spec.md:13-18, design.md:263-273)
- [ ] 2.1.3 Write test: `productDrizzleRepository.update()` replaces junction rows (spec: product-menu-many-to-many/spec.md:95-100)
- [ ] 2.1.4 Write test: CASCADE delete on product removal (spec: product-menu-many-to-many/spec.md:26-29)
- [ ] 2.1.5 Write test: `categoryDrizzleRepository.list(menuId)` joins product_menus (spec: category-management/spec.md:89-96)
- [ ] 2.1.6 Write test: category `productCount` reflects menu filter (spec: category-management/spec.md:37-41)

### 2.2 Implementation Phase (TDD Green)

- [ ] 2.2.1 Update `src/modules/menu/persistence/product-drizzle.repository.ts:10-25` — `rowToProduct()` maps `menuIds` from GROUP_CONCAT (design.md:94)
- [ ] 2.2.2 Update `src/modules/menu/persistence/product-drizzle.repository.ts:89-105` — `list(menuIds?)` with INNER JOIN product_menus (design.md:95, spec: menu-scoped-queries/spec.md:44-49)
- [ ] 2.2.3 Update `src/modules/menu/persistence/product-drizzle.repository.ts:111-147` — `create()` inserts product_menus rows (design.md:96, spec: product-management/spec.md:13-18)
- [ ] 2.2.4 Update `src/modules/menu/persistence/product-drizzle.repository.ts:149-183` — `update()` deletes old + inserts new junction rows (design.md:97, spec: product-management/spec.md:39-44)
- [ ] 2.2.5 Update `src/modules/menu/persistence/category-drizzle.repository.ts:95-111` — `list(menuId?)` joins product_menus, counts filtered products (design.md:98, spec: category-management/spec.md:89-96)

### 2.3 Use-Cases

- [ ] 2.3.1 Create `src/modules/menu/use-cases/list-products.ts` — unified use-case `listProducts(repository, menuIds?: string[])` (design.md:78)
- [ ] 2.3.2 Create `src/modules/menu/use-cases/list-categories.ts` — unified use-case `listCategories(repository, menuId?: string)` (design.md:79)
- [ ] 2.3.3 Update `src/modules/menu/use-cases/create-product.ts` — validate `menuIds.length > 0`, forward to repository (spec: admin-product-menu-assignment/spec.md:63-68)
- [ ] 2.3.4 Update `src/modules/menu/use-cases/update-product.ts` — handle `menuIds` array, forward to repository (spec: product-management/spec.md:46-51)
- [ ] 2.3.5 Write test: use-case validates empty `menuIds` returns error (design.md:250-257)

## Phase 3: Integration (Hooks + UI Wiring)

### 3.1 Hooks

- [ ] 3.1.1 Merge `src/modules/menu/hooks/use-products.ts:10-21` — unified `useProducts(menuIds?: string[])` hook (design.md:106, spec: menu-scoped-queries/spec.md:105-109)
- [ ] 3.1.2 Update `src/modules/menu/hooks/use-products.ts:36-51` — `useCreateProduct`, `useUpdateProduct` accept `menuIds` (design.md:107, spec: admin-product-menu-assignment/spec.md:82-92)
- [ ] 3.1.3 Merge `src/modules/menu/hooks/use-categories.ts:11-35` — unified `useCategories(menuId?: string)` hook (design.md:108)
- [ ] 3.1.4 Add query invalidation to mutations (spec: admin-product-menu-assignment/spec.md:100-110)

### 3.2 Components

- [ ] 3.2.1 Update `src/modules/menu/components/ProductForm.tsx` — add multi-select menu checkboxes, form state `menuIds: string[]` (design.md:112, spec: admin-product-menu-assignment/spec.md:9-31)
- [ ] 3.2.2 Update `src/app/App.tsx:112-122` — call `useProducts({ menuIds: [activeMenuId] })`, `useCategories({ menuId: activeMenuId })` (design.md:111, spec: menu-browsing/spec.md:79-91)
- [ ] 3.2.3 Update `src/modules/settings/components/SettingsModal.tsx` — call hooks without filters (show all products/categories) (design.md:113, spec: menu-browsing/spec.md:95-111)

## Phase 4: Testing (TDD Verification)

- [ ] 4.1 Write DOM test: ProductForm multi-select renders all menus (spec: admin-product-menu-assignment/spec.md:13-17)
- [ ] 4.2 Write DOM test: ProductForm pre-selects assigned menus in edit mode (spec: admin-product-menu-assignment/spec.md:19-24)
- [ ] 4.3 Write DOM test: ProductForm submits with `menuIds: []` (spec: admin-product-menu-assignment/spec.md:26-31)
- [ ] 4.4 Write DOM test: ProductForm calls mutation with `menuIds` array (design.md:301-314, spec: admin-product-menu-assignment/spec.md:39-49)
- [ ] 4.5 Write DOM test: ProductGrid re-renders on active menu change (spec: menu-browsing/spec.md:20-24)
- [ ] 4.6 Write DOM test: CategoryNav filters by active menu (spec: menu-browsing/spec.md:38-48)
- [ ] 4.7 Run full test suite (`pnpm test && pnpm test:dom`) — verify all tests green

## Phase 5: Cleanup

- [ ] 5.1 Delete `src/modules/menu/use-cases/list-products-by-menu.ts` — replaced by unified `list(menuIds?)` (design.md:101, 121)
- [ ] 5.2 Delete `src/modules/menu/use-cases/list-categories-by-menu.ts` — replaced by unified `list(menuId?)` (design.md:102, 122)
- [ ] 5.3 Update `src/modules/menu/index.ts` — export new use-cases, remove deleted ones
- [ ] 5.4 Run `pnpm tsc --noEmit` — verify no TypeScript errors (proposal.md:148)
- [ ] 5.5 Run `pnpm lint` — verify no lint errors (proposal.md:149)
- [ ] 5.6 Manual QA: create "Café con leche" → assign to "Desayuno" + "Merienda" → verify appears in both menus (proposal.md:151, design.md:319)
