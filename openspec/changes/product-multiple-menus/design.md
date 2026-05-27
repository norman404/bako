# Technical Design: product-multiple-menus

## Technical Approach

Transform product-menu relationship from 1:N to N:M using a junction table. Core strategy: create `product_menus` table, migrate existing `products.menu_id` data, update domain layer (`menuId` → `menuIds`), refactor repositories to use JOINs, propagate changes up through use-cases → hooks → components. Migration 0009 preserves `products.menu_id` column (deprecated, not dropped) for safety.

**Key insight from codebase:** Project uses neverthrow's `ResultAsync` throughout persistence layer (see `src/modules/menu/persistence/product-drizzle.repository.ts:2`), domain types are pure (no ORM decorators), and repositories inject via hooks (Clean Architecture). Category remains 1:N to products — menu filtering happens via product junction table.

---

## Architecture Decisions

| Decision | Alternatives | Rationale |
|----------|-------------|-----------|
| **Keep `products.menu_id` column** | Drop column in migration 0009 | Safer rollback path. Tauri migrations are immutable (checksum-based), dropping column is irreversible. Mark as deprecated in schema comments. |
| **`menuIds: string[]` in domain** | `menuIds: Set<string>` | Array is JSON-serializable, simpler for React state, TanStack Query caching. Set provides no added value here. |
| **Junction table index on `(menu_id, product_id)`** | Index on `(product_id, menu_id)` | Query pattern is "get products for menu X" → `menu_id` is filter column, must be first in composite index for optimal scan. |
| **Drizzle INNER JOIN for menu filter** | LEFT JOIN + WHERE | INNER JOIN is semantically correct: "products that ARE in menu X". Filters orphaned products automatically. |
| **Validation at use-case layer** | Validation at repository layer | Domain logic (e.g., "product must have ≥1 menu") lives in use-cases, not persistence. Repository is dumb data access. |
| **Soft-delete preserves junction rows** | CASCADE to `product_menus` on soft-delete | Soft-delete (`deletedAt != NULL`) only marks product as deleted. Junction rows remain (no FK to `deletedAt`). Hard delete (future) triggers CASCADE. |

---

## Data Flow

### Product Creation with Multiple Menus

```
1. ProductForm (UI) → user selects menuIds: ["m1", "m2"]
2. useCreateProduct hook → mutationFn receives { name, categoryId, menuIds, ... }
3. createProduct use-case → validates menuIds.length > 0 (business rule)
4. productDrizzleRepository.create(input)
   ├─ INSERT INTO products (id, name, categoryId, ..., menuId: null)  # menuId deprecated, set to null
   ├─ INSERT INTO product_menus (product_id, menu_id) VALUES (p_id, "m1")
   └─ INSERT INTO product_menus (product_id, menu_id) VALUES (p_id, "m2")
5. Load created product → JOIN product_menus → Product { menuIds: ["m1", "m2"] }
6. Hook invalidates TanStack Query key ["menu", "products"]
7. UI re-fetches with menu filter → ProductGrid shows new product in active menu
```

### Menu-Scoped Query (ProductGrid)

```
1. App.tsx → activeMenuId from state (e.g., "m1")
2. useProductsByMenu(activeMenuId) → listProductsByMenu use-case
3. Repository:
   SELECT products.*, GROUP_CONCAT(product_menus.menu_id) as menu_ids
   FROM products
   INNER JOIN product_menus ON products.id = product_menus.product_id
   WHERE product_menus.menu_id IN ("m1") AND products.deleted_at IS NULL
   GROUP BY products.id
4. Map row → Product { menuIds: ["m1", ...] }
5. ProductGrid renders only products matching active menu
```

### Category Filtering by Menu

```
1. useCategoriesByMenu(activeMenuId) → listCategoriesByMenu use-case
2. Repository:
   SELECT DISTINCT categories.*, COUNT(DISTINCT products.id) as product_count
   FROM categories
   INNER JOIN products ON categories.id = products.category_id
   INNER JOIN product_menus ON products.id = product_menus.product_id
   WHERE product_menus.menu_id = "m1" AND products.deleted_at IS NULL
   GROUP BY categories.id
3. Returns only categories with ≥1 product in menu "m1"
4. CategoryNav renders filtered categories
```

---

## File Changes

### Create (New Files)

- `src-tauri/migrations/0009_product_menus.sql` — Junction table + data migration
- `src/modules/menu/use-cases/list-products.ts` — New use-case for listProducts(menuIds?)
- `src/modules/menu/use-cases/list-categories.ts` — New use-case for listCategories(menuId?)

### Modify (Existing Files)

**Database & Schema:**
- `src-tauri/src/lib.rs:56` — Register migration 9
- `src/shared/db/schema.ts:26` — Add `productMenus` table, mark `products.menuId` as deprecated

**Domain:**
- `src/modules/menu/domain/product.ts:4` — Change `menuId: string | null` → `menuIds: string[]`
- `src/modules/menu/domain/ports.ts:8-17` — Update `ProductUpsertInput.menuId` → `menuIds: string[]`
- `src/modules/menu/domain/ports.ts:31-38` — Update `ProductRepository.list()` → `list(menuIds?: string[])`, remove `listByMenuId()`
- `src/modules/menu/domain/ports.ts:40-47` — Update `CategoryRepository.list()` → `list(menuId?: string)`, remove `listByMenuId()`

**Persistence:**
- `src/modules/menu/persistence/product-drizzle.repository.ts:10-25` — Update `rowToProduct()` to map `menuIds` from JOIN result
- `src/modules/menu/persistence/product-drizzle.repository.ts:89-105` — Refactor `list()` to accept `menuIds?`, JOIN `product_menus` if provided
- `src/modules/menu/persistence/product-drizzle.repository.ts:111-147` — Update `create()` to insert rows into `product_menus`
- `src/modules/menu/persistence/product-drizzle.repository.ts:149-183` — Update `update()` to delete old + insert new `product_menus` rows
- `src/modules/menu/persistence/category-drizzle.repository.ts:95-111` — Update `list()` to accept `menuId?`, JOIN `product_menus` if provided

**Use-Cases:**
- `src/modules/menu/use-cases/list-products-by-menu.ts` — DELETE (replaced by unified `list(menuIds?)`)
- `src/modules/menu/use-cases/list-categories-by-menu.ts` — DELETE (replaced by unified `list(menuId?)`)
- All use-cases in `src/modules/menu/use-cases/` — Update calls to repositories to pass `menuIds`/`menuId`

**Hooks:**
- `src/modules/menu/hooks/use-products.ts:10-21` — Merge `useProducts()` and `useProductsByMenu()` into single hook `useProducts(menuIds?: string[])`
- `src/modules/menu/hooks/use-products.ts:36-51` — Update `useCreateProduct`, `useUpdateProduct` to accept `menuIds`
- `src/modules/menu/hooks/use-categories.ts:11-35` — Merge `useCategories()` and `useCategoriesByMenu()` into single hook `useCategories(menuId?: string)`

**Components:**
- `src/app/App.tsx:112-122` — Update to call unified hooks: `useProducts({ menuIds: [activeMenuId] })`, `useCategories({ menuId: activeMenuId })`
- `src/modules/menu/components/ProductForm.tsx` — Add multi-select menu control, update form state to `menuIds: string[]`
- `src/modules/settings/components/SettingsModal.tsx` — Update admin views to call hooks without filters (show all products/categories)

**Tests:**
- All `.spec.ts` files in `src/modules/menu/` — Update to reflect `menuIds` changes
- All `.dom.spec.tsx` files — Update to mock new hook signatures

### Delete

- `src/modules/menu/use-cases/list-products-by-menu.ts` — Replaced by unified `list(menuIds?)`
- `src/modules/menu/use-cases/list-categories-by-menu.ts` — Replaced by unified `list(menuId?)`

---

## Interfaces/Contracts

### Domain Layer

```typescript
// src/modules/menu/domain/product.ts
export interface Product {
  id: string;
  categoryId: string;
  menuIds: string[];        // CHANGED: was `menuId: string | null`
  name: string;
  description: string;
  price: number;
  prepTimeMinutes: number;
  image: string;
  isPopular: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
```

### Ports Layer

```typescript
// src/modules/menu/domain/ports.ts
export interface ProductUpsertInput {
  categoryId: string;
  menuIds: string[];        // CHANGED: was `menuId: string | null`
  name: string;
  description: string;
  price: number;
  prepTimeMinutes: number;
  image: string;
  isPopular: boolean;
}

export interface ProductRepository {
  list(menuIds?: string[]): ResultAsync<Product[], MenuDomainError>;  // CHANGED signature
  findById(id: string): ResultAsync<Product, MenuDomainError>;
  create(input: ProductUpsertInput): ResultAsync<Product, MenuDomainError>;
  update(id: string, input: ProductUpsertInput): ResultAsync<Product, MenuDomainError>;
  archive(id: string): ResultAsync<void, MenuDomainError>;
}

export interface CategoryRepository {
  list(menuId?: string): ResultAsync<Category[], MenuDomainError>;  // CHANGED signature
  findById(id: string): ResultAsync<Category, MenuDomainError>;
  create(input: CategoryCreateInput): ResultAsync<Category, MenuDomainError>;
  update(id: string, input: CategoryCreateInput): ResultAsync<Category, MenuDomainError>;
  archive(id: string): ResultAsync<void, MenuDomainError>;
}
```

### Database Schema (Drizzle)

```typescript
// src/shared/db/schema.ts
export const productMenus = sqliteTable(
  "product_menus",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    menuId: text("menu_id")
      .notNull()
      .references(() => menus.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.productId, table.menuId] }),
    menuIdIdx: index("idx_product_menus_menu_id").on(table.menuId),
  })
);

export const products = sqliteTable(
  "products",
  {
    // ... existing fields ...
    menuId: text("menu_id").references(() => menus.id), // DEPRECATED: preserved for rollback, DO NOT USE
  }
);

export type ProductMenuRow = typeof productMenus.$inferSelect;
```

### SQL Migration

```sql
-- src-tauri/migrations/0009_product_menus.sql
CREATE TABLE IF NOT EXISTS `product_menus` (
  `product_id` text NOT NULL,
  `menu_id` text NOT NULL,
  PRIMARY KEY (`product_id`, `menu_id`),
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`menu_id`) REFERENCES `menus`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_product_menus_menu_id` ON `product_menus`(`menu_id`);

-- Migrate existing data
INSERT INTO `product_menus` (`product_id`, `menu_id`)
SELECT `id`, `menu_id`
FROM `products`
WHERE `menu_id` IS NOT NULL AND `deleted_at` IS NULL;

-- DO NOT drop products.menu_id column (preserve for rollback)
```

---

## Testing Strategy

### Unit Tests (Domain + Use-Cases)

**What to test:**
- `createProduct` use-case validates `menuIds.length > 0` (business rule)
- `listProducts` use-case forwards `menuIds` parameter correctly
- Domain types serialize/deserialize `menuIds: string[]` correctly

**How to test:**
- Mock `ProductRepository` with neverthrow results
- Assert use-case returns `errAsync` when `menuIds: []`
- Verify use-case calls `repository.list(menuIds: ["m1"])` when invoked with filter

**Example (Vitest):**
```typescript
// src/modules/menu/use-cases/create-product.spec.ts
it("rejects product creation with empty menuIds", async () => {
  const result = await createProduct(mockRepo, { menuIds: [], ... });
  expect(result.isErr()).toBe(true);
  expect(result._unsafeUnwrapErr().message).toContain("at least one menu");
});
```

### Integration Tests (Persistence)

**What to test:**
- `productDrizzleRepository.create()` inserts rows into `product_menus`
- `productDrizzleRepository.list(menuIds: ["m1"])` returns only products in "m1"
- `productDrizzleRepository.update()` replaces junction table rows correctly
- DELETE CASCADE works on product/menu removal

**How to test:**
- Use in-memory SQLite (`db.init(":memory:")`)
- Seed menus + categories, create products with `menuIds`
- Query `product_menus` table directly to assert row counts
- Verify `list(menuIds)` returns correct filtered results

**Example (Vitest):**
```typescript
// src/modules/menu/persistence/product-drizzle.repository.spec.ts
it("creates product and inserts junction rows", async () => {
  const result = await repo.create({ menuIds: ["m1", "m2"], ... });
  const rows = await db.select().from(productMenus).where(eq(productMenus.productId, result.value.id));
  expect(rows).toHaveLength(2);
  expect(rows.map(r => r.menuId)).toContain("m1");
  expect(rows.map(r => r.menuId)).toContain("m2");
});
```

### DOM Tests (Components)

**What to test:**
- `ProductForm` renders multi-select menu control
- Submitting form calls mutation with `menuIds: string[]`
- `ProductGrid` re-renders when active menu changes
- CategoryNav filters by active menu

**How to test (@testing-library/react):**
- Render `<ProductForm />` with mocked `useMenus()` hook
- Simulate checking multiple menu checkboxes
- Assert mutation called with correct `menuIds` array
- Use `waitFor` to verify query invalidation triggers re-fetch

**Example:**
```typescript
// src/modules/menu/components/ProductForm.dom.spec.tsx
it("submits product with multiple menu selections", async () => {
  const createMutation = vi.fn().mockResolvedValue({ id: "p1" });
  render(<ProductForm onSubmit={createMutation} />);
  
  await userEvent.click(screen.getByLabelText("Desayuno"));
  await userEvent.click(screen.getByLabelText("Merienda"));
  await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
  
  expect(createMutation).toHaveBeenCalledWith(expect.objectContaining({
    menuIds: expect.arrayContaining(["m1", "m2"])
  }));
});
```

### E2E Manual QA Checklist

- [ ] Create product "Café con leche" → assign to "Desayuno" + "Merienda" → verify appears in both menus
- [ ] Switch active menu from "Desayuno" to "Almuerzo" → verify ProductGrid updates
- [ ] Delete menu "Merienda" → verify products remain, lose that menu assignment
- [ ] Archive product → verify junction rows remain (soft-delete)
- [ ] Run migration 0009 on existing DB → verify data migrated, no errors in Tauri console
- [ ] Admin settings view → verify shows ALL products/categories (no menu filter)

---

## Open Questions

**Q1:** Should validation enforce `menuIds.length > 0` at use-case or UI level?  
**Resolution needed:** Proposal suggests validation at use-case (spec: admin-product-menu-assignment/spec.md:66). Confirm with stakeholders before implementation.

**Q2:** How to handle products with `menuIds: []` (zero menus) in ProductGrid?  
**Current decision:** Products with zero menus are invisible in all POS menu views (expected behavior). Admin views show them. No change needed.

**Q3:** Should migration 0009 UPDATE existing `products.menu_id` to NULL after migrating to junction table?  
**Current approach:** NO. Migration only INSERTs into `product_menus`, leaves `menu_id` as-is for rollback safety. Future migration can null the column if needed.

---

## Next Phase

After design approval:

1. **Tasks Phase:** Break down into concrete implementation tasks (files, functions, test cases)
2. **Apply Phase:** Implement in order: migration → schema → domain → ports → persistence → use-cases → hooks → components → tests
3. **Verify Phase:** Run test suite, manual QA, validate against all specs

**Risk mitigation before implementation:**
- Snapshot production DB before running migration 0009 in production
- Verify TypeScript compilation after domain type changes (`pnpm tsc --noEmit`)
- Run full test suite after each layer change to catch regressions early
