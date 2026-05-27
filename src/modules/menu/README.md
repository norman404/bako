# Módulo: menu

## Responsabilidad

Gestiona el catálogo completo del negocio: productos, categorías y menús. Expone componentes para visualizar el catálogo en el POS y paneles de administración para crear, editar y archivar entidades.

**Vale la pena tenerlo:** Si. Es el módulo de datos maestros del sistema. Sin él no hay productos que vender.

---

## Estructura

```
menu/
  domain/
    menu.ts              ← tipo Menu
    category.ts          ← tipo Category
    product.ts           ← tipo Product
    errors.ts            ← errores de dominio
    ports.ts             ← interfaces de repositorios + tipos de input
    product-filters.ts   ← funciones puras de filtrado
    product-order.ts     ← función pura de ordenamiento
  use-cases/
    list-menus.ts
    list-categories.ts
    list-products.ts
    create-category.ts
  persistence/
    menu-drizzle.repository.ts
    category-drizzle.repository.ts
    product-drizzle.repository.ts
  hooks/
    use-menus.ts
    use-categories.ts
    use-products.ts
  components/
    ProductGrid.tsx
    CategoryNav.tsx
    MenuSelector.tsx
    admin/
      ProductSettingsPanel.tsx
      CategorySettingsPanel.tsx
      MenuSettingsPanel.tsx
  lib/
    product-price.ts
  index.ts
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
```

### Errores

`MenuDomainError`, `ProductNotFoundError`, `CategoryNotFoundError`, `MenuNotFoundError`

### Funciones puras de dominio

```ts
filterProductsByCategory(products, categoryId): Product[]
filterProductsByName(products, name): Product[]
sortProductsForMenu(products, categories): Product[]
```

Estas funciones son la lógica del POS para mostrar el catálogo filtrado — testeable sin React ni DB.

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
```

---

## Use-cases

```ts
listMenus(repository: MenuRepository)
listCategories(repository: CategoryRepository)
listProducts(repository: ProductRepository, menuIds?: string[])
createCategory(repository: CategoryRepository, input: CategoryCreateInput)
```

**Nota:** Hay más operaciones en los hooks (update, archive, create product) que se llaman directo desde los repos sin use-case propio. Esto es funcional pero inconsistente — idealmente cada operación tendría su use-case.

---

## Persistence

Tres repositorios Drizzle que implementan los ports:

| Repositorio | Responsabilidades clave |
|-------------|------------------------|
| `menu-drizzle.repository.ts` | CRUD de menús |
| `category-drizzle.repository.ts` | CRUD + archive de categorías; valida que no haya productos activos antes de archivar |
| `product-drizzle.repository.ts` | CRUD + archive de productos; maneja la tabla asociativa `productMenus` para la relación N:N con menús |

---

## Hooks

### `useMenus()` / `useCreateMenu()` / `useUpdateMenu()` / `useDeleteMenu()`
CRUD completo de menús con React Query.

### `useCategories(menuId?)` / `useCreateCategory()` / `useUpdateCategory()` / `useArchiveCategory()`
CRUD + soft-delete de categorías. El filtro por `menuId` es opcional.

### `useProducts(menuIds?)` / `useCreateProduct()` / `useUpdateProduct()` / `useArchiveProduct()`
CRUD + soft-delete de productos. Acepta array de `menuIds` para filtrar por menú.

---

## Componentes

### POS (visualización)

| Componente | Rol |
|------------|-----|
| `ProductGrid` | Grid de productos; aplica filtros y orden del dominio; emite `onAddToCart` |
| `CategoryNav` | Barra horizontal de categorías con colores y conteo de productos |
| `MenuSelector` | Selector de menú activo (visible cuando `multiple_menus_enabled`) |

### Admin (edición)

| Componente | Rol |
|------------|-----|
| `ProductSettingsPanel` | Formulario para crear/editar/archivar productos |
| `CategorySettingsPanel` | Formulario para crear/editar/archivar categorías |
| `MenuSettingsPanel` | Formulario para crear/editar/eliminar menús |

Los paneles admin son importados por `settings/SettingsModal` — el módulo menu no sabe de settings.

---

## Lib

`product-price.ts`: helpers para convertir entre representación interna (cents) y display string (`"1.500"` ↔ `1500`).

---

## Tests

| Archivo | Qué cubre |
|---------|-----------|
| `domain/product-filters.spec.ts` | Filtrado por categoría y nombre |
| `domain/product-order.spec.ts` | Ordenamiento según categorías |
| `lib/product-price.spec.ts` | Conversión de precio |
| `persistence/menu-drizzle.repository.spec.ts` | CRUD de menús en DB |
| `persistence/category-drizzle.repository.spec.ts` | CRUD + validación de archivo |
| `persistence/product-drizzle.repository.spec.ts` | CRUD + relación productMenus |
| `use-cases/*.spec.ts` | Cobertura básica de los use-cases |
| `components/admin/*.dom.spec.tsx` | Integración DOM de paneles admin |

---

## Dependencias entre módulos

- **`order`** importa `Product` de `menu/domain/product` — dependencia domain → domain, explícita y controlada.
- **`settings`** importa los paneles admin para componerlos en el modal de configuración.
- **`pos`** usa `ProductGrid`, `CategoryNav` y `MenuSelector` para armar la pantalla principal.

---

## Veredicto

Módulo **completo y el más trabajado del sistema**. Funciona como modelo de referencia de Clean Architecture. Tiene todas las capas y buena cobertura de tests.

Punto a mejorar: algunos hooks llaman directamente al repositorio para operaciones que no tienen use-case (ej: `useUpdateProduct` llama `productDrizzleRepository.update()` sin pasar por un use-case). Funciona, pero rompe la consistencia del patrón — si en algún momento hay lógica de negocio en esa operación, hay que acordarse de moverla.
