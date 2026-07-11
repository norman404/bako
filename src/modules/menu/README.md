# Módulo: menu

## Responsabilidad

Gestiona el catálogo completo del negocio: productos, categorías, menús y **modifier groups** (la personalización de productos — nivel de hielo, toppings, comentarios, etc.). Expone componentes para visualizar el catálogo en el POS, el dialog de personalización que dispara el POS al agregar un producto, y paneles de administración para crear, editar y archivar entidades.

**Vale la pena tenerlo:** Si. Es el módulo de datos maestros del sistema, y además el único que sabe cómo personalizar un producto. Sin él no hay venta posible.

---

## Estructura

```
menu/
  domain/
    menu.ts                    ← tipo Menu
    category.ts                ← tipo Category
    product.ts                 ← tipo Product
    modifier-group.ts          ← tipos ModifierGroup, ModifierOption, SelectedModifier
                              ← funciones puras: resolveProductModifierGroups, buildCartItemKey
    errors.ts                  ← errores de dominio
    ports.ts                   ← interfaces de repositorios + tipos de input
    product-filters.ts         ← funciones puras de filtrado
    product-order.ts           ← función pura de ordenamiento
  use-cases/
    list-menus.ts
    list-categories.ts
    list-products.ts
    create-category.ts
    list-modifier-groups.ts
    list-product-modifiers.ts                ← single product, 2 queries (legacy, no usado en el POS)
    list-product-modifier-groups-batch.ts    ← batch query: 2 SQL queries para N productos
    list-category-assignments.ts             ← Map<categoryId, Set<groupId>>
    list-product-assignments.ts              ← Map<productId, Set<groupId>>
    create-modifier-group.ts
    update-modifier-group.ts                 ← (sin spec dedicado; cubierto por integración del panel)
    archive-modifier-group.ts
    assign-modifier-group.ts
    unassign-modifier-group.ts
  persistence/
    menu-drizzle.repository.ts
    category-drizzle.repository.ts
    product-drizzle.repository.ts
    modifier-group-drizzle.repository.ts
  hooks/
    use-menus.ts
    use-categories.ts
    use-products.ts
    use-filtered-products.ts                  ← combina products + categories + filtros
    use-modifier-groups.ts                    ← useModifierGroups, useProductModifierGroups,
                                              useProductModifierGroupsMap (batch),
                                              useCategoryAssignments, useProductAssignments,
                                              CRUD mutations, useAssignModifierGroup,
                                              useUnassignModifierGroup
  store/
    menu-store.ts                             ← Zustand store con la query de ProductSearch
  components/
    ProductGrid.tsx                           ← grid del POS con badge de modificadores
    CategoryNav.tsx
    MenuSelector.tsx
    ProductCustomizationDialog.tsx            ← dialog que dispara el POS al agregar un producto
    ProductSearch.tsx
    admin/
      ProductSettingsPanel.tsx
      CategorySettingsPanel.tsx
      MenuSettingsPanel.tsx
      ModifierGroupSettingsPanel.tsx          ← admin de grupos (con OptionsEditor embebido)
      OptionsEditor.tsx                       ← sub-componente aislado de CRUD de opciones
  lib/
    product-price.ts
    modifier-price.ts                         ← calculateItemUnitPrice(product, modifiers)
  manifest.ts                                ← 4 ModuleManifest registrados en MODULE_REGISTRY:
                                              productsManifest, categoriesManifest,
                                              menusManifest, modifierGroupsManifest
  index.ts
  README.md
```

---

## Dominio

### Tipos

```ts
interface Menu {
  id: string; name: string; isDefault: boolean
  createdAt: Date; updatedAt: Date
}

interface Category {
  id: string; name: string; description: string
  color: string; menuId: string
  createdAt: Date; updatedAt: Date; deletedAt: Date | null
}

interface Product {
  id: string; categoryId: string; menuIds: string[]
  name: string; description: string; price: number
  prepTimeMinutes: number; image: string | null
  isPopular: boolean
  createdAt: Date; updatedAt: Date; deletedAt: Date | null
}

type ModifierGroupType = "single" | "multiple" | "text" | "single_text";

interface ModifierGroup {
  id: string;
  name: string;
  type: ModifierGroupType;          // single=radio, multiple=checkbox, text=textarea, single_text=radio+textarea
  required: boolean;
  sortOrder: number;
  options: ModifierOption[];
  createdAt: Date; updatedAt: Date; deletedAt: Date | null;
}

interface ModifierOption {
  id: string;
  groupId: string;
  name: string;
  priceDelta: number;               // en cents; puede ser negativo (descuento)
  isDefault: boolean;               // pre-seleccionado al abrir el dialog
  sortOrder: number;
  createdAt: Date; updatedAt: Date; deletedAt: Date | null;
}

interface SelectedModifier {
  groupId: string; groupName: string;
  optionId: string | null; optionName: string | null;
  priceDelta: number;
  textValue: string | null;         // no-null para grupos tipo "text" o "single_text"
}
```

### Errores

`MenuDomainError`, `ProductNotFoundError`, `CategoryNotFoundError`, `MenuNotFoundError`.

### Funciones puras de dominio

```ts
filterProductsByCategory(products, categoryId): Product[]
filterProductsByName(products, name): Product[]
sortProductsForMenu(products, categories): Product[]

resolveProductModifierGroups(categoryGroups, productGroups): ModifierGroup[]
// Une los groups asignados a la categoría con los asignados al producto,
// deduplicando por id. category gana sobre product si hay colisión.

buildCartItemKey(productId, modifiers): string
// Clave estable para colapsar líneas iguales del carrito.
```

Las funciones de filtrado/ordenamiento son la lógica del POS para mostrar el catálogo — testeable sin React ni DB. Las funciones de modifier-group son la lógica de merge y de clave de carrito — también puras, testeadas en `domain/modifier-group.spec.ts`.

---

## Modifier groups — modelo

Un **ModifierGroup** es una "pregunta" que se le hace al cliente cuando agrega un producto al carrito. Ejemplos: *"¿Cuánto hielo?"*, *"Elegí toppings"*, *"Comentarios libres"*.

- **Tipo de grupo** (`type`):
  - `single` → radio buttons; el cliente elige una opción.
  - `multiple` → checkboxes; el cliente puede elegir varias.
  - `text` → textarea libre; el cliente escribe un comentario.
  - `single_text` → radio + textarea; una opción + un texto libre (ej: "Tamaño" + "Indicaciones especiales").
- **Requerido** (`required: true`): el dialog no permite confirmar hasta que el grupo esté satisfecho.
- **Default**: opciones con `isDefault: true` se pre-seleccionan. En `single` y `single_text` solo puede haber una default.
- **Asignación**: un grupo se asigna a una **categoría** (aplica a todos los productos de esa categoría) o a un **producto** individual. Si un grupo está asignado a ambos, gana la asignación de categoría (vía `resolveProductModifierGroups`).

### Effective groups (cliente)

`useProductModifierGroupsMap(products)` devuelve `Record<productId, ModifierGroup[]>` con los groups efectivos de cada producto. **Performance contract: 2 SQL queries totales, sin importar la cantidad de productos** (ver [Performance](#performance)).

### CustomizationDialog (cliente)

`ProductCustomizationDialog` es el dialog que dispara el POS al clickear un producto que tiene modifier groups. UX:

- Hero del producto (imagen, nombre en display serif, precio base en mono).
- Cada grupo como sección con header (nombre + badge "Requerido"/"Opcional").
- Opciones como chips custom (no radios/checkboxes nativos), con surcharge visible (`+$5.00` o `−$10.00`).
- Sticky footer con resumen de selección y precio total grande.
- CTA "Agregar" deshabilitado con hint explícito del grupo faltante cuando hay un required sin completar.
- Para texto libre, textarea mono para que el cajero lea lo que escribió.

---

## Ports (`domain/ports.ts`)

```ts
interface ProductRepository {
  list(menuIds?: string[]): ResultAsync<Product[], MenuDomainError>
  findById(id: string): ResultAsync<Product, MenuDomainError>
  create(input: ProductUpsertInput): ResultAsync<Product, MenuDomainError>
  update(id: string, input: ProductUpsertInput): ResultAsync<Product, MenuDomainError>
  archive(id: string): ResultAsync<void, MenuDomainError>
}

interface CategoryRepository { /* list, findById, create, update, archive */ }
interface MenuRepository { /* list, create, update, delete */ }

interface ModifierGroupRepository {
  list(): ResultAsync<ModifierGroup[], MenuDomainError>
  findById(id: string): ResultAsync<ModifierGroup, MenuDomainError>
  create(input): ResultAsync<ModifierGroup, MenuDomainError>
  update(id, input): ResultAsync<ModifierGroup, MenuDomainError>
  archive(id): ResultAsync<void, MenuDomainError>
  assign(input): ResultAsync<void, MenuDomainError>      // { groupId, categoryId } o { groupId, productId }
  unassign(input): ResultAsync<void, MenuDomainError>
  listByCategory(id): ResultAsync<ModifierGroup[], MenuDomainError>
  listByProduct(id): ResultAsync<ModifierGroup[], MenuDomainError>

  // Batch variants — 2 queries SQL totales para N productos
  listByCategoryIds(ids[]): ResultAsync<Map<categoryId, ModifierGroup[]>, MenuDomainError>
  listByProductIds(ids[]): ResultAsync<Map<productId, ModifierGroup[]>, MenuDomainError>

  // Full snapshot — usado por el admin panel para renderizar el estado de asignación
  listCategoryAssignments(): ResultAsync<Map<categoryId, Set<groupId>>, MenuDomainError>
  listProductAssignments(): ResultAsync<Map<productId, Set<groupId>>, MenuDomainError>
}
```

---

## Use-cases

```ts
listMenus(repository)
listCategories(repository, menuId?)
listProducts(repository, menuIds?)
createCategory(repository, input)

listModifierGroups(repository)
listProductModifiers(repository, categoryId, productId)             // single product, 2 queries
listProductModifierGroupsBatch(repository, inputs[])                // batch, 2 queries para N
listCategoryAssignments(repository)
listProductAssignments(repository)

createModifierGroup(repository, input)
updateModifierGroup(repository, id, input)
archiveModifierGroup(repository, id)
assignModifierGroup(repository, input)
unassignModifierGroup(repository, input)
```

**Convención:** Cada use-case recibe el repository como primer argumento (DI manual) y retorna `ResultAsync<T, MenuDomainError>`. No hay clases, no hay singletons — es composición pura de funciones.

---

## Persistence

Cuatro repositorios Drizzle que implementan los ports:

| Repositorio | Responsabilidades clave |
|-------------|------------------------|
| `menu-drizzle.repository.ts` | CRUD de menús |
| `category-drizzle.repository.ts` | CRUD + archive de categorías; valida que no haya productos activos antes de archivar |
| `product-drizzle.repository.ts` | CRUD + archive de productos; maneja la tabla asociativa `productMenus` para la relación N:N con menús |
| `modifier-group-drizzle.repository.ts` | CRUD + archive + assign/unassign + listByX + listByXIds (batch) + listXAssignments. **Valida** que el grupo tenga al menos una opción y que `single`/`single_text` no tengan más de una default. |

---

## Hooks

### `useMenus()` / `useCreateMenu()` / `useUpdateMenu()` / `useDeleteMenu()`
CRUD completo de menús con React Query.

### `useCategories(menuId?)` / `useCreateCategory()` / `useUpdateCategory()` / `useArchiveCategory()`
CRUD + soft-delete de categorías. El filtro por `menuId` es opcional.

### `useProducts(menuIds?)` / `useCreateProduct()` / `useUpdateProduct()` / `useArchiveProduct()`
CRUD + soft-delete de productos. Acepta array de `menuIds` para filtrar por menú.

### `useFilteredProducts(opts?)`
Hook de **composición** (no CRUD) que combina `useProducts` + `useCategories` + `useMenuStore` y aplica los filtros de dominio (`filterProductsByCategory`, `filterProductsByName`, `sortProductsForMenu`). Es lo que usa el POS para obtener la lista de productos visibles dado el menú activo, la categoría seleccionada y el search query.

### `useModifierGroups()` / `useCreateModifierGroup()` / `useUpdateModifierGroup()` / `useArchiveModifierGroup()`
CRUD + soft-delete de modifier groups. Las mutaciones invalidan `MENU_MODIFIER_GROUPS_QUERY_KEY` y `MENU_MODIFIER_ASSIGNMENTS_QUERY_KEY`.

### `useProductModifierGroups(productId, categoryId)` *(legacy, single product)*
Devuelve los groups efectivos de un solo producto. 2 queries. Útil en flows individuales.

### `useProductModifierGroupsMap(products)`
**El que usa el POS.** Devuelve `Record<productId, ModifierGroup[]>` con 1 sola query de React Query. Internamente llama `listProductModifierGroupsBatch`. Ver [Performance](#performance).

### `useCategoryAssignments()` / `useProductAssignments()`
Snapshot global de asignaciones. Usados por el admin panel para renderizar los checkboxes con estado pre-cargado. **No son N+1** — cada uno hace 1 query SQL.

### `useAssignModifierGroup()` / `useUnassignModifierGroup()`
Mutaciones para asignar/desasignar un grupo a una categoría o producto. Usan `assign` y `unassign` separados (no toggle) para que el repositorio decida el comportamiento.

---

## Componentes

### POS (visualización)

| Componente | Rol |
|------------|-----|
| `ProductGrid` | Grid de productos; aplica filtros y orden del dominio; muestra badge con icono `SlidersHorizontal` + contador de grupos cuando el flag `modifier_groups_enabled` está activo; emite `onAddToCart` |
| `CategoryNav` | Barra horizontal de categorías con colores y conteo de productos |
| `MenuSelector` | Selector de menú activo (visible cuando `multiple_menus_enabled`) |
| `ProductSearch` | Input de búsqueda por nombre |
| `ProductCustomizationDialog` | Dialog modal que dispara el POS al clickear un producto con modifier groups. Ver [CustomizationDialog (cliente)](#customizationdialog-cliente). |

### Admin (edición)

| Componente | Rol |
|------------|-----|
| `ProductSettingsPanel` | Formulario para crear/editar/archivar productos |
| `CategorySettingsPanel` | Formulario para crear/editar/archivar categorías |
| `MenuSettingsPanel` | Formulario para crear/editar/eliminar menús |
| `ModifierGroupSettingsPanel` | Panel completo de modifier groups. Lista de grupos + form crear/editar con `OptionsEditor` embebido + sección de asignación con checkboxes pre-cargados según `useCategoryAssignments` / `useProductAssignments` |
| `OptionsEditor` | Sub-componente aislado. CRUD de opciones de un grupo: add, remove, reordenar (↑↓), editar nombre/precio/default. Aplica la regla "single default" para grupos `single`/`single_text` |

Los paneles admin son importados por `settings/SettingsModal` — el módulo menu no sabe de settings.

---

## Lib

- `product-price.ts` — helpers para convertir entre representación interna (cents) y display string (`"1.500"` ↔ `1500`).
- `modifier-price.ts` — `calculateItemUnitPrice(product, modifiers)` que suma el `priceDelta` de cada modifier al precio base del producto. Usado por el `ProductCustomizationDialog` (para mostrar el total corriendo) y por el `Cart` (para calcular el unit price de cada línea).

---

## Feature flag

`modifier_groups_enabled` (en `feature_flags`): cuando está **off**, el POS no muestra badges ni dispara el dialog (agrega el producto directo al carrito). Cuando está **on**, el flujo completo de personalización está activo. La flag es estable: activarla o desactivarla **no afecta productos ya en el carrito** (siguen mostrándose con sus modifiers).

---

## Performance

`useProductModifierGroupsMap(products)` es el único hook con riesgo de N+1. Implementación:

- **Antes** (legacy): 2N queries SQL (1 `listByCategory` + 1 `listByProduct` por cada producto).
- **Ahora**: **2 queries SQL totales** (1 batch de categories, 1 batch de products), sin importar la cantidad de productos visibles.

El contrato está protegido por un test (`use-product-modifier-groups-map.dom.spec.tsx`) que verifica que la cantidad de llamadas al use-case batch es **exactamente 1** para 50 productos en 2 categorías.

El use-case `listProductModifierGroupsBatch` deduplica `categoryId` y `productId` antes de pedirle al repo, así que si 50 productos comparten la misma categoría, la query de categories devuelve `["cat-A"]` (1 elemento) en vez de 50.

**Empty-input short-circuit**: si la lista de productos está vacía, el use-case retorna `okAsync({})` sin tocar el repo.

---

## Tests

| Archivo | Qué cubre |
|---------|-----------|
| `domain/product-filters.spec.ts` | Filtrado por categoría y nombre |
| `domain/product-order.spec.ts` | Ordenamiento según categorías |
| `domain/modifier-group.spec.ts` | `resolveProductModifierGroups`, `buildCartItemKey` |
| `lib/product-price.spec.ts` | Conversión de precio |
| `lib/modifier-price.spec.ts` | Suma de `priceDelta` al precio base |
| `persistence/menu-drizzle.repository.spec.ts` | CRUD de menús en DB |
| `persistence/category-drizzle.repository.spec.ts` | CRUD + validación de archivo |
| `persistence/product-drizzle.repository.spec.ts` | CRUD + relación productMenus |
| `persistence/modifier-group-drizzle.repository.spec.ts` | CRUD + validaciones + batch queries + assignments |
| `use-cases/*.spec.ts` | Cobertura de todos los use-cases (incluido `listProductModifierGroupsBatch`) |
| `components/admin/*.dom.spec.tsx` | Integración DOM de los 4 paneles admin |
| `components/ProductCustomizationDialog.dom.spec.tsx` | UX del dialog (chips, required, summary, sticky footer) |
| `components/admin/OptionsEditor.dom.spec.tsx` | CRUD de opciones (add, remove, reorder, default exclusivity) |
| `components/ProductGrid.dom.spec.tsx` | Render del grid + badge de modificadores |
| `hooks/use-product-modifier-groups-map.dom.spec.tsx` | **Performance contract del batch** |

---

## Dependencias entre módulos

- **`order`** importa `Product` de `menu/domain/product` y `SelectedModifier` de `menu/domain/modifier-group` — dependencia domain → domain, explícita y controlada. El `Cart` muestra `groupName` por cada modifier para que el cajero sepa a qué grupo pertenece cada chip.
- **`checkout`** recibe `selectedModifiers` en cada `CartItem` para imprimir el ticket correctamente.
- **`settings`** importa los paneles admin (incluido `ModifierGroupSettingsPanel`) para componerlos en el modal de configuración. Además, los 4 `ModuleManifest` del `manifest.ts` se registran en `app/module-registry.ts` para que `SettingsModal` los descubra dinámicamente sin importar el módulo menu directamente.
- **`pos`** (`App.tsx`) usa `ProductGrid`, `CategoryNav`, `MenuSelector`, `ProductCustomizationDialog` y los hooks de modifier groups.

---

## Veredicto

Módulo **completo y el más complejo del sistema** después de los 3 rounds de refinamiento. Funciona como modelo de referencia de Clean Architecture, con una capa de presentación cuidada (dialog refinado, admin panel con sub-componentes aislados, cart que preserva contexto de grupo) y una capa de datos optimizada (batch queries, dedup en cliente).

Punto a mejorar (menor): las queries batch de modifier groups (`listByCategoryIds`, `listByProductIds`) viven en el mismo repo que las single (`listByCategory`, `listByProduct`). Podrían abstraerse a un `BatchModifierGroupRepository` si en el futuro se agregan más operaciones batch, pero hoy no aporta.

Changelog:

- **Round 1** — Fix i18n: 35 keys de `modifierGroups`/`customizationDialog` propagadas a 4 locales. Refinamiento del `ProductCustomizationDialog` (hero, chips custom, required indicator, summary, sticky footer). +10 tests.
- **Round 2** — Rediseño del `ModifierGroupSettingsPanel` con modos crear/editar, validación inline, asignación con estado visible. Nuevo sub-componente `OptionsEditor` (CRUD de opciones). `Cart` muestra `groupName` por modifier. `ProductGrid` badge con icono `SlidersHorizontal` + contador. Fix bug: `unassign` separado de `assign`. +34 tests.
- **Round 3** — Fix N+1: `useProductModifierGroupsMap` usa batch queries (2 SQL queries para N productos). Nuevo use-case `listProductModifierGroupsBatch`. +2 métodos al port (`listByCategoryIds`, `listByProductIds`). +10 tests (incluye test de **performance contract**).
