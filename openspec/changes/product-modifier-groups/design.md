# Technical Design: product-modifier-groups

## Technical Approach

Introduce a reusable `ModifierGroup` domain in the `menu` module (groups + options + assignments to categories and/or products), change `CartItem` identity from `product.id` to a unique `lineId` carrying `selectedModifiers`, propagate surcharges through cart → builders → checkout persistence, and persist order modifiers as immutable snapshots in `order_item_modifiers`. The whole UI surface is gated behind `modifier_groups_enabled`; when OFF, items keep their modifiers internally but no dialog renders and the legacy direct-add flow runs unchanged.

**Key codebase facts driving this design:** `CartItem` is currently `{product, quantity}` matched by `product.id` (`src/modules/order/domain/cart.ts:3`); `buildOrderItemsInput` flattens to `{productId, quantity, unitPrice: product.price}` and is the single propagation point to checkout (`src/modules/checkout/lib/builders.ts:22`); `createOrder` already wraps inserts in `withTransaction` (`src/modules/checkout/persistence/order-drizzle.repository.ts:585`); menu mutations call the repo directly without a use-case (`src/modules/menu/hooks/use-products.ts:25`); `productMenus` junction table uses a composite PK in SQL but only an index in Drizzle (`src/shared/db/schema.ts:50`); migrations are sequential, last is `0013`, next is `0014`/`0015`; the `MenuSettingsPanel` manifest pattern (`src/modules/menu/manifest.ts:22`) is the template for the new admin panel.

---

## Architecture Decisions

| Decision | Alternatives | Rationale |
|----------|-------------|-----------|
| **Snapshot in `order_item_modifiers` (denormalized `group_name`, `option_name`, `price_delta`)** | FK references to `modifier_options` living tables | Historical immutability. A modifier group/option can be archived or renamed after the order is placed; the ticket and historical reports must not change. Snapshots freeze the values at checkout time. Matches the existing pattern where `order_items.unit_price` is already a snapshot of `products.price`. |
| **`lineId` as UUID generated at add-time** | Composite key `{product.id + selectedModifiers hash}` | UUID is stable across quantity changes and decouples identity from modifier content (avoiding hash-collision reasoning). Simple to thread through `increment/decrement/remove` and to use as React `key`. Generated in the store via `crypto.randomUUID()` (already used in `order-drizzle.repository.ts:336`). |
| **Merge cat + product: dedup by `group_id`, product wins** | Union with duplicates, or product-only override | Resolved in proposal (Q2): product "inherits" category groups and "adds" its own. If both assign the same `group_id`, the product-level assignment wins (no duplicate group shown). Implemented in pure function `resolveProductModifierGroups(categoryGroups, productGroups)` returning a `Map<groupId, ModifierGroup>` keyed for dedup. |
| **Surcharge formula in shared pure function `calculateItemUnitPrice(product, modifiers)`** | Inline calculation in cart and checkout separately | Single source of truth. The formula `(product.price + sum(modifier.priceDelta)) * quantity` is used in `calculateCartTotals` (cart) and in `buildOrderItemsInput` (checkout). Lives in `src/modules/menu/lib/modifier-price.ts` (menu owns the domain concept). Both `order` and `checkout` import it — no business rule duplicated. |
| **No transaction in menu repo; transaction for order+modifiers** | Wrap all menu writes in `withTransaction` | Menu repo follows the existing `product-drizzle.repository.ts` pattern (no `withTransaction`). Assignments are delete-then-insert like `productMenus`; worst case is a partial re-assignment which the user can retry. Checkout `createOrder` MUST stay transactional because order + items + modifiers + payment must be atomic — already wrapped, we just add `createOrderItemModifiers` inside the existing `withTransaction` block. |
| **`ModifierGroupType` as string union `'single' \| 'multiple' \| 'text' \| 'single_text'`** | Drizzle `text` enum or TS enum | String union matches the project convention (`CHECKOUT_FULFILLMENT_TYPE` as const object + union type in `src/modules/checkout/domain/order.ts:1`). SQL CHECK constraint mirrors the union. No enum serialization mismatch, JSON-safe, discriminated-union friendly. |
| **Flag gating at UI level only; domain/persistence always handle modifiers** | Gate at domain layer (skip modifiers when flag OFF) | Resolved in proposal (Q5): items keep modifiers internally even when flag OFF. Domain and persistence must always process `selectedModifiers` so existing orders and cart items with modifiers remain valid. Only UI gates: `ProductGrid` hides the badge, `App.handleAddToCart` skips the dialog and calls `addItem(product)` (no modifiers), `Cart`/`OrderSummary` hide modifier chips. This keeps the flag purely presentational and avoids data loss on flag toggle. |

---

## Data Flow

### 1. Product customization dialog → cart → checkout → persistence

```
ProductGrid (click product with modifiers)
  │
  ├─ App.handleAddToCart(product) checks: product has modifier groups? (flag ON)
  │     YES → open ProductCustomizationDialog(product, groups)
  │            ├─ resolveProductModifierGroups(catGroups, productGroups) → merged list
  │            ├─ user selects options → SelectedModifier[] (defaults pre-selected)
  │            ├─ required groups not satisfied → "Add" button DISABLED
  │            └─ onConfirm → addItem(product, selectedModifiers)
  │     NO  → addItem(product)  (legacy path, no modifiers)
  │
  ├─ order-store.addItem(product, modifiers?)
  │     └─ generates lineId = crypto.randomUUID()
  │        → addItemToCart(items, product, modifiers)
  │           match by lineId (NOT product.id) → never collapses two lines
  │
  ├─ calculateCartTotals(items)
  │     total = Σ (calculateItemUnitPrice(product, item.selectedModifiers) * quantity)
  │
  ├─ Checkout: buildCreateOrderInput(items, ...)
  │     buildOrderItemsInput(items) →
  │        { productId, quantity,
  │          unitPrice: calculateItemUnitPrice(product, modifiers),
  │          modifiers: CheckoutOrderItemModifierInput[] }
  │
  └─ orderDrizzleRepository.createOrder(input)  [withTransaction]
        ├─ createOrderRow
        ├─ createPaymentRow
        ├─ createOrderItemRows  → order_items rows (unitPrice includes surcharge)
        └─ createOrderItemModifiers(orderItemRows, input.items)
           → for each item, for each modifier:
              INSERT order_item_modifiers (id, order_item_id, group_id, group_name,
                                           option_id, option_name, price_delta, text_value, created_at)
```

### 2. Admin creates modifier group → assigns to category → product inherits

```
SettingsModal → ModifierGroupSettingsPanel (flag ON)
  │
  ├─ useCreateModifierGroup() → createModifierGroup use-case → repo.create
  │     INSERT modifier_groups (id, name, type, required, sort_order, ...)
  │     INSERT modifier_options (id, group_id, name, price_delta, is_default, ...) × N
  │
  ├─ useAssignModifierGroup({ categoryId, groupId }) → repo.assignToCategory
  │     INSERT category_modifier_groups (category_id, group_id)
  │
  └─ At POS, ProductGrid loads product:
        useProductModifierGroups(productId) → listProductModifiers use-case
          ├─ repo.listByCategory(product.categoryId)  → categoryGroups
          ├─ repo.listByProduct(productId)            → productGroups
          └─ resolveProductModifierGroups(cat, product) → merged (product wins on conflict)
```

### 3. Flag OFF path (modifiers preserved, UI hidden)

```
modifier_groups_enabled = false
  │
  ├─ ProductGrid: no modifier badge shown (useProducts returns products as-is)
  ├─ App.handleAddToCart(product):
  │     flag OFF → skip dialog → addItem(product) with selectedModifiers = []
  │
  ├─ Existing cart items with selectedModifiers (from a previous flag-ON session):
  │     ├─ Cart.tsx: modifier chips HIDDEN (flag check in render)
  │     ├─ calculateCartTotals: STILL adds surcharges (domain always computes)
  │     └─ item keeps lineId + selectedModifiers intact
  │
  └─ Checkout: buildOrderItemsInput still propagates modifiers (if any)
     → createOrderItemModifiers inserts snapshots (modifiers array may be empty)
     → ticket print: PrintOrderItem.modifiers filtered out in UI when flag OFF
```

---

## File Changes

### Create (New Files)

| File | Description |
|------|-------------|
| `src-tauri/migrations/0014_product_modifiers.sql` | 5 new tables: `modifier_groups`, `modifier_options`, `category_modifier_groups`, `product_modifier_groups`, `order_item_modifiers` |
| `src-tauri/migrations/0015_modifiers_flag_seed.sql` | Seed `modifier_groups_enabled = false` in `feature_flags` |
| `src/modules/menu/domain/modifier-group.ts` | Types: `ModifierGroupType`, `ModifierGroup`, `ModifierOption`, `SelectedModifier`, `CartItemModifier` + pure functions `resolveProductModifierGroups`, `buildCartItemKey` |
| `src/modules/menu/persistence/modifier-group-drizzle.repository.ts` | Drizzle repo implementing `ModifierGroupRepository` (CRUD groups + options + assignments + list-by-category/product) |
| `src/modules/menu/use-cases/list-modifier-groups.ts` | List all groups (admin) |
| `src/modules/menu/use-cases/create-modifier-group.ts` | Create group + options in one call |
| `src/modules/menu/use-cases/update-modifier-group.ts` | Update group + replace options (delete-then-insert) |
| `src/modules/menu/use-cases/archive-modifier-group.ts` | Soft-delete group (options archived via cascade) |
| `src/modules/menu/use-cases/assign-modifier-group.ts` | Assign group to category and/or product |
| `src/modules/menu/use-cases/list-product-modifiers.ts` | Resolve merged groups for a product (cat + product) |
| `src/modules/menu/hooks/use-modifier-groups.ts` | React Query hooks: `useModifierGroups`, `useCreateModifierGroup`, `useUpdateModifierGroup`, `useArchiveModifierGroup`, `useAssignModifierGroup`, `useProductModifierGroups(productId)` |
| `src/modules/menu/components/admin/ModifierGroupSettingsPanel.tsx` | Admin panel: list, create, edit, archive groups; assign to categories/products; i18n via `useTranslation` |
| `src/modules/menu/components/ProductCustomizationDialog.tsx` | POS dialog: renders groups, handles selection, validates required groups, blocks "Add" until valid |
| `src/modules/menu/lib/modifier-price.ts` | Pure shared function `calculateItemUnitPrice(product, modifiers)` — single source of surcharge truth |

### Modify (Existing Files)

| File | Change |
|------|--------|
| `src-tauri/src/lib.rs` | Register migrations 14 and 15 in the migrations array |
| `src/shared/db/schema.ts` | Add 5 Drizzle table definitions + `*Row` / `*Insert` type exports |
| `src/modules/menu/domain/ports.ts` | Add `ModifierGroupRepository` interface + `ModifierGroupUpsertInput`, `ModifierOptionInput`, `ModifierAssignmentInput` types |
| `src/modules/menu/domain/errors.ts` | Add `ModifierGroupNotFoundError`, `ModifierOptionNotFoundError` |
| `src/modules/menu/components/ProductGrid.tsx` | Show modifier badge on product cards when flag ON and product has groups |
| `src/modules/menu/manifest.ts` | Add `modifierGroupsManifest: ModuleManifest` with `flagKey: "modifier_groups_enabled"` |
| `src/modules/menu/index.ts` | Export `ModifierGroupSettingsPanel`, `ProductCustomizationDialog`, modifier hooks/types |
| `src/modules/order/domain/cart.ts` | `CartItem` gains `lineId: string`, `selectedModifiers: SelectedModifier[]`; `calculateCartTotals` uses `calculateItemUnitPrice`; `addItemToCart` accepts modifiers and matches by `lineId`; `increment/decrement/remove` take `lineId` |
| `src/modules/order/store/order-store.ts` | `addItem(product, modifiers?)` generates `lineId`; `incrementItemQuantity(lineId)`, `decrementItemQuantity(lineId)`, `removeItem(lineId)` operate by `lineId` |
| `src/modules/order/components/Cart.tsx` | Render modifier chips per line (flag-gated); buttons use `lineId` |
| `src/modules/checkout/domain/order.ts` | `CheckoutOrderItemInput` gains `modifiers: CheckoutOrderItemModifierInput[]`; `CheckoutOrderItem` gains `modifiers: CheckoutOrderItemModifier[]`; add `CheckoutOrderItemModifierInput` / `CheckoutOrderItemModifier` interfaces |
| `src/modules/checkout/domain/print-ticket.ts` | `PrintOrderItem` gains `modifiers: PrintOrderItemModifier[]`; add `PrintOrderItemModifier` interface |
| `src/modules/checkout/lib/builders.ts` | `buildOrderItemsInput` computes `unitPrice = calculateItemUnitPrice(product, modifiers)` and propagates `modifiers` array |
| `src/modules/checkout/persistence/order-drizzle.repository.ts` | Add `createOrderItemModifiers(tx, orderItemRows, items)` inside existing `withTransaction`; `normalizeCreateOrderInput` copies `modifiers`; `rowToCheckoutOrder` loads + maps modifiers |
| `src/modules/checkout/components/CheckoutModal.OrderSummary.tsx` | Show modifier chips per item (flag-gated) |
| `src/modules/feature-flags/store/feature-flags-store.ts` | Add `modifier_groups_enabled: false` to `DEFAULT_FLAGS` |
| `src/app/module-registry.ts` | Add `modifierGroupsManifest` to `MODULE_REGISTRY` array |
| `src/app/App.tsx` | `handleAddToCart(product, modifiers?)`: if flag ON and product has groups → open `ProductCustomizationDialog`; else legacy `addItem(product)`. `synchronizedCartItems` matches by `lineId`. `printOrder` maps `input.items` modifiers to `PrintOrderItem.modifiers` |

---

## Interfaces / Contracts

### Modifier Group Domain

```typescript
// src/modules/menu/domain/modifier-group.ts
import type { Product } from "@/modules/menu/domain/product";

export type ModifierGroupType = "single" | "multiple" | "text" | "single_text";

export interface ModifierOption {
  id: string;
  groupId: string;
  name: string;
  priceDelta: number;   // cents, default 0
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface ModifierGroup {
  id: string;
  name: string;
  type: ModifierGroupType;
  required: boolean;
  sortOrder: number;
  options: ModifierOption[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// User selection in the dialog / cart (references option, may carry text)
export interface SelectedModifier {
  groupId: string;
  groupName: string;        // denormalized for cart display
  optionId: string | null;  // null for `text` type
  optionName: string | null;// null for `text` type
  priceDelta: number;       // snapshot of option.priceDelta at selection time
  textValue: string | null; // non-null for `text` / `single_text` types
}

// Snapshot persisted in order_item_modifiers
export interface CartItemModifier {
  groupId: string;
  groupName: string;
  optionId: string | null;
  optionName: string | null;
  priceDelta: number;
  textValue: string | null;
}

// Pure functions
export function resolveProductModifierGroups(
  categoryGroups: ModifierGroup[],
  productGroups: ModifierGroup[],
): ModifierGroup[];  // dedup by id, product wins on conflict

export function buildCartItemKey(productId: string, modifiers: SelectedModifier[]): string;
// used only for dedup-before-add heuristics; lineId remains the canonical identity
```

### Modifier Group Repository Port

```typescript
// src/modules/menu/domain/ports.ts  (additions)
import type { ModifierGroup, ModifierGroupType, ModifierOption } from "./modifier-group";

export interface ModifierGroupUpsertInput {
  name: string;
  type: ModifierGroupType;
  required: boolean;
  sortOrder: number;
  options: ModifierOptionInput[];
}

export interface ModifierOptionInput {
  id?: string;           // present on update, omitted on create
  name: string;
  priceDelta: number;
  isDefault: boolean;
  sortOrder: number;
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
}
```

### Updated Cart (order domain)

```typescript
// src/modules/order/domain/cart.ts
import type { SelectedModifier } from "@/modules/menu/domain/modifier-group";

export interface CartItem {
  lineId: string;              // NEW: UUID, canonical identity
  product: Product;
  quantity: number;
  selectedModifiers: SelectedModifier[];  // NEW: may be []
}

export function calculateCartTotals(items: CartItem[]): CartTotals;
// total = Σ (calculateItemUnitPrice(item.product, item.selectedModifiers) * item.quantity)

export function addItemToCart(
  items: CartItem[],
  product: Product,
  modifiers: SelectedModifier[],
  lineId: string,
): CartItem[];   // match by lineId, never collapse distinct modifier combos

export function incrementItemQuantity(items: CartItem[], lineId: string): CartItem[];
export function decrementItemQuantity(items: CartItem[], lineId: string): CartItem[];
export function removeItemFromCart(items: CartItem[], lineId: string): CartItem[];
```

### Shared surcharge function

```typescript
// src/modules/menu/lib/modifier-price.ts
import type { Product } from "@/modules/menu/domain/product";
import type { SelectedModifier, CartItemModifier } from "@/modules/menu/domain/modifier-group";

export function calculateItemUnitPrice(
  product: Product,
  modifiers: Array<{ priceDelta: number }>,
): number {
  const surcharge = modifiers.reduce((sum, m) => sum + m.priceDelta, 0);
  return product.price + surcharge;   // unit price, not multiplied by quantity
}
```

### Updated Order Store

```typescript
// src/modules/order/store/order-store.ts
interface OrderStore {
  currentOrder: CartItem[];
  addItem: (product: Product, modifiers?: SelectedModifier[]) => void;
  incrementItemQuantity: (lineId: string) => void;   // was (productId)
  decrementItemQuantity: (lineId: string) => void;   // was (productId)
  removeItem: (lineId: string) => void;              // was (productId)
  clearOrder: () => void;
}
// addItem generates lineId = crypto.randomUUID() internally
```

### Updated Checkout Domain

```typescript
// src/modules/checkout/domain/order.ts  (additions)
export interface CheckoutOrderItemModifierInput {
  groupId: string;
  groupName: string;
  optionId: string | null;
  optionName: string | null;
  priceDelta: number;
  textValue: string | null;
}

export interface CheckoutOrderItemModifier {
  id: string;
  orderItemId: string;
  groupId: string | null;
  groupName: string;
  optionId: string | null;
  optionName: string;
  priceDelta: number;
  textValue: string | null;
  createdAt: Date;
}

export interface CheckoutOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;   // includes surcharge (computed in builders)
  modifiers: CheckoutOrderItemModifierInput[];  // NEW
}

export interface CheckoutOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  modifiers: CheckoutOrderItemModifier[];  // NEW (loaded from snapshot table)
  createdAt: Date;
}
// calculateOrderTotal unchanged: unitPrice already includes surcharge
```

### Updated Print Ticket

```typescript
// src/modules/checkout/domain/print-ticket.ts  (additions)
export interface PrintOrderItemModifier {
  groupName: string;
  optionName: string | null;
  textValue: string | null;
}

export interface PrintOrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers: PrintOrderItemModifier[];  // NEW
}
```

### Drizzle Schema (5 new tables)

```typescript
// src/shared/db/schema.ts  (additions)
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const modifierGroups = sqliteTable(
  "modifier_groups",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type").notNull(),  // CHECK constraint in SQL mirrors union
    required: integer("required", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("idx_modifier_groups_deleted_at").on(table.deletedAt)],
);

export const modifierOptions = sqliteTable(
  "modifier_options",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => modifierGroups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceDelta: integer("price_delta").notNull().default(0),
    isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("idx_modifier_options_group_id").on(table.groupId),
    index("idx_modifier_options_deleted_at").on(table.deletedAt),
  ],
);

export const categoryModifierGroups = sqliteTable(
  "category_modifier_groups",
  {
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => modifierGroups.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.categoryId, table.groupId] }),
    index("idx_category_modifier_groups_group_id").on(table.groupId),
  ],
);

export const productModifierGroups = sqliteTable(
  "product_modifier_groups",
  {
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => modifierGroups.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.productId, table.groupId] }),
    index("idx_product_modifier_groups_group_id").on(table.groupId),
  ],
);

export const orderItemModifiers = sqliteTable(
  "order_item_modifiers",
  {
    id: text("id").primaryKey(),
    orderItemId: text("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    groupId: text("group_id"),  // nullable: group may be archived later
    groupName: text("group_name").notNull(),
    optionId: text("option_id"),
    optionName: text("option_name").notNull(),
    priceDelta: integer("price_delta").notNull().default(0),
    textValue: text("text_value"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_order_item_modifiers_order_item_id").on(table.orderItemId)],
);

export type ModifierGroupRow = typeof modifierGroups.$inferSelect;
export type ModifierOptionRow = typeof modifierOptions.$inferSelect;
export type CategoryModifierGroupRow = typeof categoryModifierGroups.$inferSelect;
export type ProductModifierGroupRow = typeof productModifierGroups.$inferSelect;
export type OrderItemModifierRow = typeof orderItemModifiers.$inferSelect;
```

### SQL Migration `0014_product_modifiers.sql`

```sql
-- src-tauri/migrations/0014_product_modifiers.sql
CREATE TABLE IF NOT EXISTS `modifier_groups` (
  `id` text NOT NULL PRIMARY KEY,
  `name` text NOT NULL,
  `type` text NOT NULL CHECK(`type` IN ('single','multiple','text','single_text')),
  `required` integer NOT NULL DEFAULT 0,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `deleted_at` integer
);
CREATE INDEX IF NOT EXISTS `idx_modifier_groups_deleted_at` ON `modifier_groups`(`deleted_at`);

CREATE TABLE IF NOT EXISTS `modifier_options` (
  `id` text NOT NULL PRIMARY KEY,
  `group_id` text NOT NULL REFERENCES `modifier_groups`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `price_delta` integer NOT NULL DEFAULT 0,
  `is_default` integer NOT NULL DEFAULT 0,
  `sort_order` integer NOT NULL DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `deleted_at` integer
);
CREATE INDEX IF NOT EXISTS `idx_modifier_options_group_id` ON `modifier_options`(`group_id`);
CREATE INDEX IF NOT EXISTS `idx_modifier_options_deleted_at` ON `modifier_options`(`deleted_at`);

CREATE TABLE IF NOT EXISTS `category_modifier_groups` (
  `category_id` text NOT NULL REFERENCES `categories`(`id`) ON DELETE CASCADE,
  `group_id` text NOT NULL REFERENCES `modifier_groups`(`id`) ON DELETE CASCADE,
  PRIMARY KEY (`category_id`, `group_id`)
);
CREATE INDEX IF NOT EXISTS `idx_category_modifier_groups_group_id` ON `category_modifier_groups`(`group_id`);

CREATE TABLE IF NOT EXISTS `product_modifier_groups` (
  `product_id` text NOT NULL REFERENCES `products`(`id`) ON DELETE CASCADE,
  `group_id` text NOT NULL REFERENCES `modifier_groups`(`id`) ON DELETE CASCADE,
  PRIMARY KEY (`product_id`, `group_id`)
);
CREATE INDEX IF NOT EXISTS `idx_product_modifier_groups_group_id` ON `product_modifier_groups`(`group_id`);

CREATE TABLE IF NOT EXISTS `order_item_modifiers` (
  `id` text NOT NULL PRIMARY KEY,
  `order_item_id` text NOT NULL REFERENCES `order_items`(`id`) ON DELETE CASCADE,
  `group_id` text,
  `group_name` text NOT NULL,
  `option_id` text,
  `option_name` text NOT NULL,
  `price_delta` integer NOT NULL DEFAULT 0,
  `text_value` text,
  `created_at` integer NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_order_item_modifiers_order_item_id` ON `order_item_modifiers`(`order_item_id`);
```

### SQL Migration `0015_modifiers_flag_seed.sql`

```sql
-- src-tauri/migrations/0015_modifiers_flag_seed.sql
INSERT INTO `feature_flags` (`key`, `value`, `updated_at`) VALUES
  ('modifier_groups_enabled', 'false', strftime('%s', 'now') * 1000);
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| **Unit (domain)** | `resolveProductModifierGroups` dedups by id, product wins on conflict. `calculateItemUnitPrice` sums surcharges correctly. `addItemToCart` with distinct modifiers produces separate lines (same product, different `lineId`). `calculateCartTotals` includes surcharges. `buildCartItemKey` stable for same selection. | Vitest on pure functions in `src/modules/menu/domain/modifier-group.ts` and `src/modules/order/domain/cart.ts`. Mock `Product` + `SelectedModifier` fixtures. Assert no React, no DB. |
| **Unit (use-cases)** | `createModifierGroup` validates `options.length > 0` and at most 1 `isDefault=true` for `single` type. `assignModifierGroup` requires at least one of `categoryId`/`productId`. `listProductModifiers` calls repo with both cat and product ids and returns merged result. | Vitest with mocked `ModifierGroupRepository` returning neverthrow results. Assert `errAsync` on invalid input. |
| **Unit (builders)** | `buildOrderItemsInput` sets `unitPrice = calculateItemUnitPrice(product, modifiers)` and propagates `modifiers` array. Empty modifiers → `unitPrice = product.price`, `modifiers = []`. | Vitest on `src/modules/checkout/lib/builders.ts` with `CartItem` fixtures including `lineId` + `selectedModifiers`. |
| **Integration (persistence)** | `modifierGroupDrizzleRepository.create` inserts group + options rows. `update` replaces options (delete-then-insert). `archive` soft-deletes group. `listByCategory` / `listByProduct` return only non-archived groups. `orderDrizzleRepository.createOrder` inserts `order_item_modifiers` rows inside the existing transaction (atomicity: rollback on modifier insert failure rolls back order). | In-memory SQLite (`db.init(":memory:")`), seed categories/products/groups, call repo, query tables directly via Drizzle. Assert row counts, snapshot field values, cascade behavior. |
| **DOM (components)** | `ProductCustomizationDialog` renders groups by type (radio for `single`, checkbox for `multiple`, input for `text`); "Add" button disabled when required group unsatisfied; defaults pre-selected; onConfirm calls `addItem` with `SelectedModifier[]`. `ModifierGroupSettingsPanel` renders list, create form, assign controls. `Cart` renders modifier chips per line and uses `lineId` for inc/dec/remove buttons. `ProductGrid` shows badge when product has groups and flag ON; no badge when flag OFF. | `@testing-library/react` + `vitest.dom.config.ts`. Mock hooks (`useProductModifierGroups`, `useFeatureFlagsStore`). `userEvent` for selection. Assert `addItem` called with correct modifiers; assert button disabled state. |
| **E2E (manual QA)** | Full flow: admin creates group "Nivel de hielo" (`single`, options Sin/Poco/Normal/Extra with Extra +$5) → assigns to category → product inherits → POS click product → dialog opens → select "Extra" → cart shows surcharge in total → checkout → order persisted with snapshot → ticket printed shows "Extra hielo". Flag OFF: dialog skipped, badge hidden, existing cart items keep modifiers internally. Archived group: historical order snapshots unchanged. | Manual run with `pnpm tauri dev`. Verify DB via Tauri SQLite console. Verify migration 0014 + 0015 apply clean on existing DB. |

---

## Open Questions

**Q1:** Should `createOrderItemModifiers` fail the whole order transaction if a single modifier insert fails, or skip the offending modifier and log?  
**Current decision:** Fail the transaction (atomicity). The existing `createOrder` already throws on partial `order_items` insert (`order-drizzle.repository.ts:434`); modifiers follow the same rule. No silent partial orders.

**Q2:** How to seed the `modifier_groups_enabled` flag in existing DBs that already ran migration 0013 but not 0015?  
**Current decision:** Migration 0015 is an `INSERT` with no `IF NOT EXISTS` guard on SQLite. If re-applied to a DB that somehow already has the row, Tauri checksums prevent re-running. For fresh installs, 0015 inserts the seed. No additional logic needed.

**Q3:** Should `ProductCustomizationDialog` reuse the existing modal/drawer primitives, or introduce a new dialog component?  
**Current decision:** Reuse whatever `MenuSelector` / `ProductForm` already use (verify in tasks phase). No new primitive unless the existing one cannot host the form layout.

---

## Next Phase

After design approval:

1. **Tasks Phase:** Break down into concrete implementation tasks ordered by dependency: migration → schema → domain → ports → persistence → use-cases → hooks → cart/order store → checkout builders/persistence → components → App wiring → flag/registry.
2. **Apply Phase:** Implement in batches via `general` sub-agents — each batch = one cohesive unit (menu domain+repo, order cart+store, checkout propagation, UI dialog, admin panel, flag/registry wiring). Parallelize independent units; sequence ones that touch the same files.
3. **Verify Phase:** Run `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm test:dom`; manual QA checklist; verify migration round-trip on a copy of a real DB.

**Risk mitigation before implementation:**
- Snapshot a real DB before running migrations 0014/0015 in production.
- After `CartItem` identity change, run the full DOM test suite — `App.tsx` `synchronizedCartItems` and every `Cart`/`CheckoutModal` consumer must be updated in the same batch to avoid a red suite.
- Keep `calculateItemUnitPrice` in `menu/lib` (not `order` or `checkout`) so both depend on `menu` — the layer that owns the concept — avoiding a circular dependency.