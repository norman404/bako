# Master Spec: product-modifier-groups

## Intent

Permitir que los productos del catálogo puedan personalizarse con opciones dinámicas (nivel de hielo, nivel de azúcar, comentarios, toppings) mediante **modifier groups** reutilizables asignables a categorías y/o productos. Cada selección puede modificar el precio (surcharges) y cada combinación producto+opciones se trata como una línea distinta en el carrito, persistiéndose con snapshots en la orden para preservar historial inmutable.

## Scope

### In Scope
- Modelo de datos: tablas `modifier_groups`, `modifier_options`, `category_modifier_groups`, `product_modifier_groups`, `order_item_modifiers` + migración `0014`.
- Dominio `menu`: tipos `ModifierGroup`, `ModifierOption`, assignments; ports para CRUD + asignación.
- Persistencia `menu`: repositorio Drizzle para modifier groups y asignaciones.
- Dominio `order`: `CartItem` con identidad compuesta (`product.id + selectedModifiers`); `calculateCartTotals` con surcharges.
- Store `order`: `addItem(product, modifiers)`, operaciones por item-line ID (no por `productId`).
- Dominio `checkout`: `CheckoutOrderItemInput` y `CheckoutOrderItem` con modifiers; `calculateOrderTotal` con surcharges; `PrintOrderItem` con modifiers.
- Builders `checkout`: `buildOrderItemsInput` propaga modifiers y calcula `unitPrice` con surcharges.
- Persistencia `checkout`: `createOrderItemRows` + `createOrderItemModifiers` (snapshots).
- UI POS: dialog/modal de personalización al click en producto (antes de agregar al carrito).
- UI admin: panel `ModifierGroupSettingsPanel` para gestionar grupos y opciones.
- Feature flag `modifier_groups_enabled` en `DEFAULT_FLAGS` + migración para seed inicial.
- Module registry: manifest del módulo de modifiers.
- 4 tipos de selección: `single` (radio), `multiple` (checkbox), `text` (comentario libre), `single_text` (radio + texto libre).
- Surcharges: cada `ModifierOption` lleva `priceDelta` en centavos (default 0).
- Templates asignables: grupos independientes asignables a categorías Y/O productos.

### Out of Scope
- Localización de modifier groups (nombres en múltiples idiomas).
- Importación/exportación masiva de modifier groups.
- Modifier groups anidados (grupo dentro de grupo).
- Validación de stock por opción (ej: "sin leche" no agota inventario).
- Auditoría/historial de cambios en modifier groups (solo snapshots en orden).
- UI de drag-and-drop para reordenar opciones dentro de un grupo.
- Modifiers a nivel de categoría que afecten el precio base del producto (solo surcharges por opción).

## Capabilities

### New Capabilities
- `modifier-group-management`: CRUD completo de modifier groups y sus options (crear, editar, archivar, reordenar).
- `modifier-group-assignment`: Asignar modifier groups a categorías y/o productos (templates independientes).
- `product-customization-dialog`: UI de selección de modifiers al agregar un producto al carrito.
- `cart-item-configuration`: Identidad compuesta en el carrito (product.id + selectedModifiers), cálculo de totales con surcharges.

### Modified Capabilities
- `product-management`: Productos pueden tener modifier groups asignados (propios + heredados de categoría).
- `order-checkout`: Items de orden persisten modifiers como snapshots; cálculo de total incluye surcharges; ticket impreso muestra opciones.
- `menu-browsing`: ProductGrid muestra indicador visual si un producto tiene modifiers disponibles.

## Approach

1. **Database Layer**:
   - Migración `0014_product_modifiers.sql`:
     - `modifier_groups`: `(id TEXT PK, name TEXT NOT NULL, type TEXT NOT NULL CHECK(type IN ('single','multiple','text','single_text')), required INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER)`.
     - `modifier_options`: `(id TEXT PK, group_id TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE, name TEXT NOT NULL, price_delta INTEGER NOT NULL DEFAULT 0, is_default INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER)`.
     - `category_modifier_groups`: `(category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE, group_id TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE, PRIMARY KEY(category_id, group_id))`.
     - `product_modifier_groups`: `(product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE, group_id TEXT NOT NULL REFERENCES modifier_groups(id) ON DELETE CASCADE, PRIMARY KEY(product_id, group_id))`.
     - `order_item_modifiers`: `(id TEXT PK, order_item_id TEXT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE, group_id TEXT, group_name TEXT NOT NULL, option_id TEXT, option_name TEXT NOT NULL, price_delta INTEGER NOT NULL DEFAULT 0, text_value TEXT, created_at INTEGER NOT NULL)`.
   - Registrar migración 14 en `src-tauri/src/lib.rs`.
   - Migración `0015_modifiers_flag_seed.sql`: insertar `modifier_groups_enabled = false` en `feature_flags`.

2. **Schema Layer**: Agregar 5 tablas a `src/shared/db/schema.ts` con Drizzle.

3. **Domain Layer (`menu`)**:
   - `domain/modifier-group.ts`: tipos `ModifierGroup`, `ModifierOption`, `ModifierGroupType`, `SelectedModifier`, `CartItemModifier`.
   - `domain/ports.ts`: interfaces `ModifierGroupRepository` (CRUD groups + options + assignments).
   - `domain/errors.ts`: `ModifierGroupNotFoundError`, `ModifierOptionNotFoundError`.
   - Funciones puras: `calculateItemModifiersTotal`, `resolveProductModifierGroups` (merge cat + product), `buildCartItemKey`.

4. **Persistence Layer (`menu`)**: `modifier-group-drizzle.repository.ts` implementando `ModifierGroupRepository`.

5. **Use-cases (`menu`)**: `list-modifier-groups`, `create-modifier-group`, `update-modifier-group`, `archive-modifier-group`, `assign-modifier-group`, `list-product-modifiers`.

6. **Domain Layer (`order`)**:
   - `CartItem` gana `lineId: string` (identidad única por línea), `selectedModifiers: SelectedModifier[]`.
   - `calculateCartTotals` incluye surcharges: `(product.price + sum(modifier.priceDelta)) * quantity`.
   - `addItemToCart` acepta modifiers; dos items del mismo producto con distintos modifiers NO se colapsan.

7. **Store (`order`)**:
   - `addItem(product, modifiers?)` — genera `lineId` único.
   - `incrementItemQuantity(lineId)`, `decrementItemQuantity(lineId)`, `removeItem(lineId)` — operan por `lineId`, no por `productId`.

8. **Domain Layer (`checkout`)**:
   - `CheckoutOrderItemInput` gana `modifiers: CheckoutOrderItemModifierInput[]`.
   - `CheckoutOrderItem` gana `modifiers: CheckoutOrderItemModifier[]` (snapshot persistido).
   - `calculateOrderTotal` incluye surcharges.
   - `PrintOrderItem` gana `modifiers: PrintOrderItemModifier[]`.

9. **Builders (`checkout`)**: `buildOrderItemsInput` propaga modifiers y calcula `unitPrice = product.price + sum(modifier.priceDelta)`.

10. **Persistence (`checkout`)**: `createOrderItemRows` + `createOrderItemModifiers` (inserta snapshots en `order_item_modifiers`).

11. **Component Layer**:
    - `ProductCustomizationDialog` (modal al click en producto con modifiers disponibles).
    - `ModifierGroupSettingsPanel` (panel admin en settings).
    - `Cart.tsx` muestra modifiers por línea.
    - `CheckoutModal.OrderSummary.tsx` muestra modifiers en resumen.
    - `ProductGrid` muestra badge/indicador si producto tiene modifiers.

12. **App.tsx**: `handleAddToCart(product, modifiers?)` — si producto tiene modifiers, abre dialog; si no, agrega directo.

13. **Feature Flag + Registry**: `modifier_groups_enabled` en `DEFAULT_FLAGS`; manifest en `module-registry.ts`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src-tauri/migrations/0014_product_modifiers.sql` | New | 5 tablas nuevas |
| `src-tauri/migrations/0015_modifiers_flag_seed.sql` | New | Seed flag `modifier_groups_enabled` |
| `src-tauri/src/lib.rs` | Modified | Registrar migraciones 14 y 15 |
| `src/shared/db/schema.ts` | Modified | 5 tablas Drizzle + tipos |
| `src/modules/menu/domain/modifier-group.ts` | New | Tipos de dominio |
| `src/modules/menu/domain/ports.ts` | Modified | `ModifierGroupRepository` |
| `src/modules/menu/domain/errors.ts` | Modified | Errores de modifier |
| `src/modules/menu/persistence/modifier-group-drizzle.repository.ts` | New | Repo Drizzle |
| `src/modules/menu/use-cases/` | New | 6 use-cases |
| `src/modules/menu/hooks/use-modifier-groups.ts` | New | Hooks React Query |
| `src/modules/menu/components/admin/ModifierGroupSettingsPanel.tsx` | New | Panel admin |
| `src/modules/menu/components/ProductCustomizationDialog.tsx` | New | Dialog POS |
| `src/modules/menu/components/ProductGrid.tsx` | Modified | Badge de modifiers |
| `src/modules/menu/manifest.ts` | Modified | Manifest de modifiers |
| `src/modules/menu/index.ts` | Modified | Exports públicos |
| `src/modules/order/domain/cart.ts` | Modified | Identidad compuesta + surcharges |
| `src/modules/order/store/order-store.ts` | Modified | API por lineId |
| `src/modules/order/components/Cart.tsx` | Modified | Mostrar modifiers |
| `src/modules/checkout/domain/order.ts` | Modified | Modifiers en items + total |
| `src/modules/checkout/domain/print-ticket.ts` | Modified | Modifiers en ticket |
| `src/modules/checkout/lib/builders.ts` | Modified | Propagar modifiers + surcharges |
| `src/modules/checkout/persistence/order-drizzle.repository.ts` | Modified | Insertar order_item_modifiers |
| `src/modules/checkout/components/CheckoutModal.OrderSummary.tsx` | Modified | Mostrar modifiers |
| `src/modules/feature-flags/store/feature-flags-store.ts` | Modified | `modifier_groups_enabled` |
| `src/app/module-registry.ts` | Modified | Registrar manifest |
| `src/app/App.tsx` | Modified | `handleAddToCart` con modifiers + dialog |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Identidad compuesta del CartItem rompe sincronización en `App.tsx` (`synchronizedCartItems` usa `product.id`) | High | Cambiar match a `lineId`; actualizar `synchronizedCartItems` para preservar modifiers |
| Performance: resolver modifiers por producto requiere queries adicionales (cat + product) | Medium | Cargar modifiers en batch al listar productos; cache en React Query |
| Surcharges cambian cálculo de total en 2 lugares (cart + checkout) | Medium | Función pura compartida `calculateItemUnitPrice(product, modifiers)` |
| Migration 0014 falla en DBs con datos existentes | Low | Migración solo CREATE TABLE (no toca datos existentes); seed flag separado en 0015 |
| Modifiers archivados pero asignados a productos activos | Medium | Snapshot en `order_item_modifiers` preserva datos; UI filtra grupos no-archivados |
| Breaking change en API del store de order (itemId → lineId) | High | Tests de regresión en cart.ts + order-store; actualizar todos los consumers |
| UI dialog agrega fricción al flujo rápido del POS | Medium | Solo mostrar dialog si el producto tiene modifiers asignados; si no, agregar directo |

## Rollback Plan

- **Migraciones 14 y 15 son one-way** (Tauri no soporta rollback). Las tablas quedan pero son no-op si el flag está OFF.
- **Revert code**: restaurar `CartItem = {product, quantity}`, `addItem(product)`, operations por `productId`. Revertir `CheckoutOrderItemInput` sin modifiers. Revertir builders.
- **Feature flag**: `modifier_groups_enabled = false` oculta toda la UI de modifiers sin tocar código.
- **DB safe state**: las tablas nuevas son inertes sin código que las use. No hay pérdida de datos.

## Success Criteria

- [ ] Admin puede crear un modifier group "Nivel de hielo" tipo `single` con opciones (Sin hielo, Poco, Normal, Extra).
- [ ] Admin puede asignar "Nivel de hielo" a una categoría Y a un producto individual.
- [ ] Al click en un producto con modifiers, aparece un dialog con las opciones disponibles.
- [ ] Al seleccionar "Extra hielo" con surcharge +$5, el total del carrito refleja el recargo.
- [ ] Dos cafés del mismo producto con hielo distinto aparecen como líneas separadas en el carrito.
- [ ] El checkout persiste los modifiers como snapshots en `order_item_modifiers`.
- [ ] El ticket impreso muestra las opciones seleccionadas por item.
- [ ] Si `modifier_groups_enabled = false`, toda la UI de modifiers desaparece y el flujo funciona como antes.
- [ ] Migración 0014 crea las 5 tablas sin error en DBs existentes.
- [ ] Si se archiva un modifier group, las órdenes históricas conservan los snapshots.
- [ ] `pnpm tsc --noEmit` sin errores.
- [ ] `pnpm lint` sin errores.
- [ ] `pnpm test` y `pnpm test:dom` pasan.
- [ ] App buildea correctamente.

## Resolved Questions

> Todas las preguntas de clarificación fueron resueltas con el humano.

1. **Groups `required`**: El dialog **bloquea** el botón "Agregar" hasta que se seleccione una opción. Para grupos tipo `text` required, debe haber al menos 1 caracter ingresado.

2. **Merge cat + producto**: **Merge con dedup por `group_id`**. Se muestran todos los groups de la categoría + los del producto. Si ambos asignan el mismo `group_id`, **gana la asignación del producto** (no se duplica). El producto "hereda" de la categoría y "agrega" los suyos.

3. **Defaults en `single`**: **Máximo 1 opción** puede tener `is_default = true` en grupos tipo `single`. En `multiple`, varias pueden ser default. El dialog **carga los defaults pre-seleccionados** automáticamente.

4. **Límite en `multiple`**: **Ilimitado**. No hay campo `maxSelected` en el modelo. El usuario puede seleccionar todas las opciones que quiera.

5. **Flag OFF con items activos**: Los items existentes **conservan** sus modifiers internamente, pero la UI **no los muestra**. El checkout los persiste igual. Al agregar items nuevos, no aparece el dialog (flujo directo como antes).

6. **i18n**: El nuevo `ModifierGroupSettingsPanel` y el dialog de personalización **usan i18n** (`useTranslation`) con namespaces `settings` y `menu`. Sigue el patrón de `MenuSettingsPanel`. Se agregan las keys correspondientes a los locales.