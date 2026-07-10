# Tasks: Product Modifier Groups

## Phase 1: Database Foundation (Migrations + Schema + Flag)

- [x] 1.1 Create `src-tauri/migrations/0014_product_modifiers.sql` — 5 tables (design.md:477-531)
- [x] 1.2 Create `src-tauri/migrations/0015_modifiers_flag_seed.sql` — seed `modifier_groups_enabled=false` (design.md:535-539)
- [x] 1.3 Register migrations 14 and 15 in `src-tauri/src/lib.rs` migrations array
- [x] 1.4 Add 5 Drizzle table definitions + `*Row` types to `src/shared/db/schema.ts` (design.md:378-473)
- [x] 1.5 Add `modifier_groups_enabled: false` to `DEFAULT_FLAGS` in `src/modules/feature-flags/store/feature-flags-store.ts`

## Phase 2: Menu Domain (Types + Ports + Errors + Lib)

### 2.1 RED — Tests for pure functions

- [x] 2.1.1 Write test: `resolveProductModifierGroups` dedups by id, product wins on conflict (spec: modifier-group-assignment/spec.md:150-187, design.md:205-208)
- [x] 2.1.2 Write test: `calculateItemUnitPrice` sums surcharges; empty modifiers → product.price (spec: cart-item-configuration/spec.md:160-192, design.md:285-297)
- [x] 2.1.3 Write test: `buildCartItemKey` stable for identical selection, differs otherwise (design.md:210-211)
- [x] 2.1.4 Run `pnpm test` — confirm RED (no implementation yet)

### 2.2 GREEN — Domain types + pure functions

- [x] 2.2.1 Create `src/modules/menu/domain/modifier-group.ts` — `ModifierGroupType`, `ModifierOption`, `ModifierGroup`, `SelectedModifier`, `CartItemModifier` + pure functions `resolveProductModifierGroups`, `buildCartItemKey` (design.md:154-212)
- [x] 2.2.2 Create `src/modules/menu/lib/modifier-price.ts` — `calculateItemUnitPrice(product, modifiers)` (design.md:285-297)
- [x] 2.2.3 Add `ModifierGroupNotFoundError`, `ModifierOptionNotFoundError` to `src/modules/menu/domain/errors.ts` (design.md:132)
- [x] 2.2.4 Add `ModifierGroupRepository` interface + `ModifierGroupUpsertInput`, `ModifierOptionInput`, `ModifierAssignmentInput` to `src/modules/menu/domain/ports.ts` (design.md:216-252)
- [x] 2.2.5 Run `pnpm test` — confirm GREEN for 2.1.x

### 2.3 REFACTOR

- [x] 2.3.1 Review pure functions for clarity; ensure no business rule duplicated. Run `pnpm test` — stay GREEN

## Phase 3: Menu Persistence (Repo + Use-Cases + Hooks)

### 3.1 RED — Repository tests

- [x] 3.1.1 Write test: `modifierGroupDrizzleRepository.create()` inserts group + options rows (spec: modifier-group-management/spec.md:9-31, design.md:550)
- [x] 3.1.2 Write test: `update()` replaces options (delete-then-insert); rejects archived group (spec: modifier-group-management/spec.md:35-57)
- [x] 3.1.3 Write test: `archive()` soft-deletes group + cascades options; archived excluded from `list()` (spec: modifier-group-management/spec.md:61-82, 191-200)
- [x] 3.1.4 Write test: `assign()` to category and product; duplicate rejected; unassign removes (spec: modifier-group-assignment/spec.md:9-94)
- [x] 3.1.5 Write test: `listByCategory` / `listByProduct` ordered by sortOrder, exclude archived (spec: modifier-group-assignment/spec.md:98-143)
- [x] 3.1.6 Run `pnpm test` — confirm RED

### 3.2 GREEN — Repository implementation

- [x] 3.2.1 Create `src/modules/menu/persistence/modifier-group-drizzle.repository.ts` — implement `ModifierGroupRepository` (CRUD + assignments + list-by-cat/product) (design.md:113)
- [x] 3.2.2 Run `pnpm test` — confirm GREEN for 3.1.x

### 3.3 GREEN — Use-cases

- [x] 3.3.1 Create `src/modules/menu/use-cases/list-modifier-groups.ts` (design.md:114)
- [x] 3.3.2 Create `src/modules/menu/use-cases/create-modifier-group.ts` — validate `options.length > 0`, single-default constraint (spec: modifier-group-management/spec.md:116-143, design.md:548)
- [x] 3.3.3 Create `src/modules/menu/use-cases/update-modifier-group.ts` — reject archived, replace options (design.md:116)
- [x] 3.3.4 Create `src/modules/menu/use-cases/archive-modifier-group.ts` — soft-delete + cascade (design.md:117)
- [x] 3.3.5 Create `src/modules/menu/use-cases/assign-modifier-group.ts` — require at least one of categoryId/productId (design.md:118, design.md:548)
- [x] 3.3.6 Create `src/modules/menu/use-cases/list-product-modifiers.ts` — call repo.listByCategory + listByProduct, return merged (design.md:119, spec: modifier-group-assignment/spec.md:146-187)

### 3.4 GREEN — Hooks

- [x] 3.4.1 Create `src/modules/menu/hooks/use-modifier-groups.ts` — `useModifierGroups`, `useCreateModifierGroup`, `useUpdateModifierGroup`, `useArchiveModifierGroup`, `useAssignModifierGroup`, `useProductModifierGroups(productId)` with React Query invalidation (design.md:120)

### 3.5 REFACTOR

- [x] 3.5.1 Ensure use-cases delegate to repo without business logic in hooks. Run `pnpm test` — stay GREEN

## Phase 4: Order Domain + Store (Identity Change — CRITICAL)

### 4.1 RED — Cart domain tests

- [x] 4.1.1 Write test: `CartItem` has `lineId` + `selectedModifiers`; same product + different modifiers → separate lines (spec: cart-item-configuration/spec.md:9-25)
- [x] 4.1.2 Write test: `addItemToCart` with identical modifiers collapses (quantity++); empty modifiers collapses by product (spec: cart-item-configuration/spec.md:28-55)
- [x] 4.1.3 Write test: `calculateCartTotals` includes surcharges; empty modifiers = legacy total (spec: cart-item-configuration/spec.md:160-192)
- [x] 4.1.4 Write test: `incrementItemQuantity(lineId)`, `decrementItemQuantity(lineId)`, `removeItemFromCart(lineId)` operate by lineId; non-existent rejected; decrement-to-zero removes (spec: cart-item-configuration/spec.md:116-156)
- [x] 4.1.5 Run `pnpm test` — confirm RED

### 4.2 GREEN — Cart domain + store

- [x] 4.2.1 Update `src/modules/order/domain/cart.ts` — new `CartItem` with `lineId`, `selectedModifiers`; `addItemToCart(items, product, modifiers, lineId)` matches by `lineId`; `calculateCartTotals` uses `calculateItemUnitPrice` (design.md:256-281)
- [x] 4.2.2 Update `src/modules/order/store/order-store.ts` — `addItem(product, modifiers?)` generates `lineId = crypto.randomUUID()`; `increment/decrement/remove` by `lineId` (design.md:299-312)
- [x] 4.2.3 Run `pnpm test` — confirm GREEN for 4.1.x

### 4.3 REFACTOR — Backward compat

- [x] 4.3.1 Verify all existing cart tests still pass (empty modifiers = legacy path). Run `pnpm test` — stay GREEN

## Phase 5: Checkout Domain + Builders + Persistence

### 5.1 RED — Builder + checkout domain tests

- [x] 5.1.1 Write test: `buildOrderItemsInput` propagates modifiers + computes `unitPrice = calculateItemUnitPrice(product, modifiers)` (spec: order-checkout/spec.md:93-117, design.md:549)
- [x] 5.1.2 Write test: `calculateOrderTotal` includes surcharges; empty modifiers = `unitPrice * quantity` (spec: order-checkout/spec.md:62-89, 199-221)
- [x] 5.1.3 Write test: `createOrder` inserts `order_item_modifiers` snapshots inside transaction; rollback on failure (spec: order-checkout/spec.md:29-59, 120-142, design.md:550)
- [x] 5.1.4 Write test: `rowToCheckoutOrder` loads modifiers from snapshot table; archived group rename doesn't alter snapshot (spec: order-checkout/spec.md:41-59)
- [x] 5.1.5 Run `pnpm test` — confirm RED

### 5.2 GREEN — Domain interfaces

- [x] 5.2.1 Update `src/modules/checkout/domain/order.ts` — add `CheckoutOrderItemModifierInput`, `CheckoutOrderItemModifier` interfaces; `CheckoutOrderItemInput.modifiers`, `CheckoutOrderItem.modifiers` (design.md:314-356)
- [x] 5.2.2 Update `src/modules/checkout/domain/print-ticket.ts` — add `PrintOrderItemModifier` interface; `PrintOrderItem.modifiers` (design.md:358-373)

### 5.3 GREEN — Builders + persistence

- [x] 5.3.1 Update `src/modules/checkout/lib/builders.ts` — `buildOrderItemsInput` computes `unitPrice` via `calculateItemUnitPrice`, propagates modifiers array (design.md:141)
- [x] 5.3.2 Update `src/modules/checkout/persistence/order-drizzle.repository.ts` — `normalizeCreateOrderInput` copies modifiers; add `createOrderItemModifiers(tx, orderItemRows, items)` inside existing `withTransaction`; `rowToCheckoutOrder` loads modifiers (design.md:142, design.md:19)
- [x] 5.3.3 Run `pnpm test` — confirm GREEN for 5.1.x

### 5.4 REFACTOR

- [x] 5.4.1 Verify all existing checkout tests still pass. Run `pnpm test` — stay GREEN

## Phase 6: UI Components (Dialog + Admin + Cart + Grid)

### 6.1 RED — DOM tests

- [x] 6.1.1 Write DOM test: `ProductCustomizationDialog` renders groups by type (radio `single`, checkbox `multiple`, textarea `text`, radio+textarea `single_text`) (spec: product-customization-dialog/spec.md:38-129)
- [x] 6.1.2 Write DOM test: required groups block "Add" button until satisfied; defaults pre-selected (spec: product-customization-dialog/spec.md:132-171)
- [x] 6.1.3 Write DOM test: running price updates on selection change; text-only group doesn't affect price (spec: product-customization-dialog/spec.md:175-201)
- [x] 6.1.4 Write DOM test: `ModifierGroupSettingsPanel` renders list, create form, assign controls (design.md:121)
- [ ] 6.1.5 Write DOM test: `Cart` renders modifier chips per line; inc/dec/remove buttons use `lineId` (spec: cart-item-configuration/spec.md:116-156, design.md:138)
- [x] 6.1.6 Write DOM test: `ProductGrid` shows modifier badge when flag ON + groups present; hidden otherwise (spec: menu-browsing/spec.md:5-28, 112-128)
- [x] 6.1.7 Run `pnpm test:dom` — confirm RED

### 6.2 GREEN — Components

- [x] 6.2.1 Create `src/modules/menu/components/ProductCustomizationDialog.tsx` — groups by type, validation, running price, onConfirm → `addItem(product, modifiers)` (design.md:122, spec: product-customization-dialog/spec.md)
- [x] 6.2.2 Create `src/modules/menu/components/admin/ModifierGroupSettingsPanel.tsx` — list/create/edit/archive groups, assign to categories/products, i18n via `useTranslation` (design.md:121)
- [x] 6.2.3 Update `src/modules/menu/components/ProductGrid.tsx` — modifier badge, flag-gated (design.md:133)
- [ ] 6.2.4 Update `src/modules/order/components/Cart.tsx` — modifier chips per line, `lineId` for operations (design.md:138)
- [ ] 6.2.5 Update `src/modules/checkout/components/CheckoutModal.OrderSummary.tsx` — modifier chips per item, flag-gated (design.md:143)
- [x] 6.2.6 Run `pnpm test:dom` — confirm GREEN for 6.1.x

### 6.3 REFACTOR

- [ ] 6.3.1 Extract shared modifier chip rendering if duplicated. Run `pnpm test:dom` — stay GREEN

## Phase 7: App Wiring + Module Registry

### 7.1 RED — App wiring DOM test

- [x] 7.1.1 Write DOM test: `handleAddToCart` with flag ON + product with groups → dialog opens, `addItem` called with modifiers; flag OFF → direct `addItem(product)` (spec: menu-browsing/spec.md:30-83, design.md:146)
- [x] 7.1.2 Run `pnpm test:dom` — confirm RED

### 7.2 GREEN — Wiring

- [x] 7.2.1 Update `src/app/App.tsx` — `handleAddToCart(product, modifiers?)`, flag-gated dialog; `synchronizedCartItems` by `lineId`; `printOrder` maps modifiers to `PrintOrderItem.modifiers` (design.md:146)
- [x] 7.2.2 Update `src/modules/menu/manifest.ts` — add `modifierGroupsManifest` with `flagKey: "modifier_groups_enabled"` (design.md:134)
- [x] 7.2.3 Update `src/app/module-registry.ts` — add `modifierGroupsManifest` to `MODULE_REGISTRY` (design.md:145)
- [x] 7.2.4 Update `src/modules/menu/index.ts` — export `ModifierGroupSettingsPanel`, `ProductCustomizationDialog`, modifier hooks/types (design.md:135)
- [x] 7.2.5 Run `pnpm test:dom` — confirm GREEN for 7.1.x

### 7.3 REFACTOR

- [x] 7.3.1 Verify flag OFF path preserves legacy flow end-to-end. Run `pnpm test` && `pnpm test:dom` — stay GREEN

## Phase 8: Verification

- [x] 8.1 Run `pnpm tsc --noEmit` — no TypeScript errors (proposal.md:164)
- [x] 8.2 Run `pnpm lint` — no lint errors (proposal.md:165)
- [x] 8.3 Run `pnpm test` — all unit tests green (proposal.md:166)
- [x] 8.4 Run `pnpm test:dom` — all DOM tests green (proposal.md:166)
- [ ] 8.5 Manual QA: admin creates "Nivel de hielo" → assigns to category → POS dialog → surcharge in total → checkout snapshot → ticket shows options (proposal.md:154-160, design.md:552)
- [ ] 8.6 Manual QA: flag OFF — dialog skipped, badge hidden, existing cart items keep modifiers internally (proposal.md:161, design.md:83-100)
- [ ] 8.7 Manual QA: archived group — historical order snapshots unchanged (proposal.md:163)
- [ ] 8.8 Manual QA: migrations 0014 + 0015 apply clean on existing DB (proposal.md:162)