# Proposal: product-multiple-menus

## Intent

Transform the product-menu relationship from 1:N (one product belongs to one menu) to N:M (one product can appear in multiple menus simultaneously). This allows products like "Café con leche" to appear in both "Desayuno" and "Merienda" menus without duplication, while preserving the existing 1:N product-category relationship.

## Scope

### In Scope
- New `product_menus` junction table (product_id, menu_id) for N:M relationship.
- Migration 0009 to create `product_menus` table and migrate existing `products.menu_id` data.
- Domain entity updates: `Product` with `menuIds: string[]` instead of `menuId: string`.
- Port interface updates in `ProductRepository` and `CategoryRepository` to support menu-scoped queries.
- Use-case updates: `listProducts`, `createProduct`, `updateProduct`, `listCategories` to handle multiple menus.
- Drizzle repository implementation for new table and queries with joins.
- Hooks updates: `useProducts`, `useCategories` to accept `menuIds` filter.
- Component updates: ProductForm to allow multi-select menu assignment; ProductGrid/CategoryNav to filter by active menu.
- Data migration logic: existing products with `menu_id` are migrated to `product_menus` rows.
- Unit tests for domain, use-cases, repositories; DOM tests for updated components.

### Out of Scope
- Changing the product-category relationship (remains 1:N).
- Menu-specific pricing (same product, different price per menu).
- Menu-specific product names or descriptions (localization is out of scope).
- Bulk menu assignment UI (advanced admin features).
- Historical tracking of menu assignments (audit log).
- Rollback of migration 0009 (migration is one-way; rollback requires manual intervention).

## Capabilities

### New Capabilities
- `product-menu-many-to-many`: Products can be assigned to zero, one, or multiple menus.
- `menu-scoped-queries`: Repositories and use-cases can filter products/categories by a set of menu IDs.
- `admin-product-menu-assignment`: Admin UI (ProductForm) allows selecting multiple menus when creating/editing a product.

### Modified Capabilities
- `product-management`: Creating/updating a product now involves assigning to multiple menus.
- `menu-browsing`: Product listing and category filtering respect the active menu's products (via junction table).
- `category-management`: Categories can see which products are available in a given menu context.

## Approach

1. **Database Layer**:
   - Create migration `0009_product_menus.sql` with:
     - `product_menus` table: `(product_id TEXT, menu_id TEXT, PRIMARY KEY (product_id, menu_id), FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE, FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE)`.
     - Data migration: `INSERT INTO product_menus (product_id, menu_id) SELECT id, menu_id FROM products WHERE menu_id IS NOT NULL;`.
     - **Do NOT drop `products.menu_id` column yet** — deprecate for now, consider dropping in future migration.
   - Register migration 9 in `src-tauri/src/lib.rs`.

2. **Schema Layer**:
   - Add `productMenus` table to `src/shared/db/schema.ts` with Drizzle schema definition.
   - Update `products` table schema comments to mark `menuId` as deprecated.

3. **Domain Layer** (`src/modules/menu/domain/`):
   - Update `Product` type: change `menuId?: string` to `menuIds: string[]`.
   - Update factory/helper functions to work with arrays.
   - Update error types if needed (e.g., validation for empty menu array).

4. **Ports Layer** (`src/modules/menu/domain/ports.ts`):
   - Update `ProductRepository` methods:
     - `listProducts(menuIds?: string[]): ResultAsync<Product[], MenuPersistenceError>`.
     - `createProduct(input: CreateProductInput): ResultAsync<Product, MenuPersistenceError>` where `CreateProductInput` now includes `menuIds: string[]`.
     - `updateProduct(id: string, input: UpdateProductInput): ResultAsync<Product, MenuPersistenceError>`.
   - Update `CategoryRepository.listCategories(menuId?: string)` to accept optional menu filter (existing signature compatible).

5. **Persistence Layer** (`src/modules/menu/persistence/`):
   - Update `product-drizzle.repository.ts`:
     - `listProducts`: join with `product_menus` table, filter by `menuIds` if provided.
     - `createProduct`: insert into `products`, then insert rows into `product_menus`.
     - `updateProduct`: delete existing `product_menus` rows for product, insert new ones.
     - `deleteProduct`: CASCADE handles deletion in `product_menus` automatically.
   - Update `category-drizzle.repository.ts`:
     - `listCategories`: if `menuId` provided, filter products via `product_menus` join.

6. **Use-Cases Layer** (`src/modules/menu/use-cases/`):
   - Update all use-cases to pass through `menuIds` or `menuId` parameters to repositories.
   - Validate `menuIds` is non-empty when creating/updating products (business rule).

7. **Hooks Layer** (`src/modules/menu/hooks/`):
   - Update `useProducts` to accept `menuIds?: string[]` and pass to use-case.
   - Update `useCreateProduct`, `useUpdateProduct` to accept `menuIds` in mutation input.
   - Update `useCategories` if needed (already supports `menuId` filter).

8. **Component Layer** (`src/modules/menu/components/`):
   - Update `ProductForm`: replace single menu select with multi-select (checkboxes or multi-select dropdown).
   - Update `ProductGrid`, `CategoryNav`: pass active `menuId` (from store) to hooks as `menuIds: [activeMenuId]`.
   - Update `MenuSelector` if needed (existing component likely unaffected).

9. **State Management**:
   - No change to `orderStore` or `menuStore` needed (they consume hooks, which abstract the DB changes).

10. **Testing**:
    - Update unit tests for domain functions with `menuIds` arrays.
    - Update use-case tests with mock repositories returning arrays.
    - Update repository tests to verify junction table inserts/deletes.
    - Update component DOM tests to verify multi-select UI and data flow.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/shared/db/schema.ts` | Modified | Add `productMenus` table; mark `products.menuId` as deprecated |
| `src-tauri/migrations/` | New | `0009_product_menus.sql` with table creation and data migration |
| `src-tauri/src/lib.rs` | Modified | Register migration 9 |
| `src/modules/menu/domain/product.ts` | Modified | `menuId` → `menuIds` in type definition |
| `src/modules/menu/domain/ports.ts` | Modified | Update signatures for `menuIds` parameters |
| `src/modules/menu/use-cases/` | Modified | All product use-cases updated for array handling |
| `src/modules/menu/persistence/product-drizzle.repository.ts` | Modified | Joins with `product_menus`, multi-row inserts/deletes |
| `src/modules/menu/persistence/category-drizzle.repository.ts` | Modified | Menu-scoped category queries via product join |
| `src/modules/menu/hooks/` | Modified | `useProducts`, `useCreateProduct`, `useUpdateProduct` signatures |
| `src/modules/menu/components/ProductForm.tsx` | Modified | Multi-select menu assignment UI |
| `src/modules/menu/components/ProductGrid.tsx` | Modified | Pass active menu as array to `useProducts` |
| `src/modules/menu/components/CategoryNav.tsx` | Modified | Menu-scoped product filtering |
| Tests (`.spec.ts`, `.dom.spec.tsx`) | Modified | Update all affected test files |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Data migration fails for existing products with `menu_id IS NULL` | Low | Migration SQL only migrates rows where `menu_id IS NOT NULL`; orphaned products remain valid (zero menus) |
| Breaking existing UI when `multiple_menus_enabled` is OFF | Medium | Feature flag system already exists; migration happens regardless, but UI adapts via flag |
| Performance degradation on product queries with joins | Medium | Add index on `product_menus(menu_id, product_id)`; test with realistic data size |
| Orphaned rows in `product_menus` if product deletion fails | Low | `ON DELETE CASCADE` ensures automatic cleanup |
| TypeScript migration errors (`menuId` → `menuIds`) missed in some files | Medium | Run `pnpm tsc --noEmit` after changes; grep for `menuId` usage; comprehensive test coverage |
| Admin confusion if product has zero menus assigned | Low | Add validation in use-case: `menuIds.length > 0` required for product creation |

## Rollback Plan

**Important:** Migration 0009 is **one-way**. Rolling back requires manual intervention.

- **Revert code changes**: Restore `menuId` field in domain, repositories, hooks, components.
- **Database state**: `product_menus` table will remain (no-op if unused). To fully rollback:
  - Manually update `products.menu_id` from first row in `product_menus` per product.
  - Drop `product_menus` table manually (not via migration revert — Tauri migrations are immutable).
- **Safe revert point**: Before running migration 0009, take SQLite backup (`.db` file snapshot).

## Success Criteria

- [ ] Admin can create a product and assign it to multiple menus via ProductForm multi-select.
- [ ] Admin can edit a product and change its menu assignments.
- [ ] Product appears in ProductGrid only when active menu matches one of its assigned menus.
- [ ] CategoryNav filters products correctly based on active menu (products visible in category only if assigned to active menu).
- [ ] Migration 0009 successfully migrates existing products with `menu_id` to `product_menus` table.
- [ ] Deleting a product cascades to `product_menus` rows (no orphaned junction rows).
- [ ] Deleting a menu cascades to `product_menus` rows (products remain, lose that menu assignment).
- [ ] All existing unit tests and DOM tests pass after updates.
- [ ] New tests cover: multi-menu product creation, menu-scoped queries, junction table CRUD.
- [ ] No TypeScript errors (`pnpm tsc --noEmit`).
- [ ] No lint errors (`pnpm lint`).
- [ ] App builds successfully (`pnpm build`).
- [ ] Manual QA: Create product "Café con leche" → assign to "Desayuno" and "Merienda" → verify appears in both menu views.
