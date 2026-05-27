# Bako — Guía para agentes

**Bako** es un POS (point of sale) de escritorio construido con React 19, TypeScript, Tauri 2, Drizzle ORM + SQLite, Zustand 5 y TanStack Query. La UI es local-first: la base de datos corre embebida vía `@tauri-apps/plugin-sql`. No tiene routing — es una UI de pantalla única.

---

## Arquitectura: Clean Architecture por módulos

El proyecto sigue Clean Architecture adaptada al frontend, organizada **por feature** (no por capa). Cada módulo en `src/modules/` es un slice vertical con capas internas.

### Por qué

- El dominio (reglas de negocio) debe poder testearse sin React, sin BD, sin ningún framework.
- Los servicios externos (BD, impresión, APIs) deben adaptarse a nuestras interfaces, no al revés.
- Cambiar un repositorio concreto (Drizzle → otra cosa) no debe tocar el dominio ni los use-cases.

### Regla de dependencias

Las capas externas dependen de las internas. **Nunca al revés.**

```
domain/ (entidades + ports) ← use-cases ← persistence
                                         ↑
                                        hooks  (inyectan persistence, llaman use-cases)
                                         ↑
                                      components  (solo UI, reciben callbacks)
```

- `domain/` no importa nada del proyecto (solo `src/lib/` y `neverthrow`)
- `domain/ports.ts` depende solo de tipos de `domain/`
- `use-cases/` depende solo de `domain/ports.ts` y `domain/`
- `persistence/` implementa los ports, importa de `domain/` y `src/shared/db/`
- `hooks/` inyecta el repositorio concreto y llama los use-cases
- `components/` solo UI: recibe datos y callbacks, sin lógica de negocio

### Señales de que algo está mal

- Un archivo en `domain/` importa desde `hooks/`, `store/`, o `persistence/` → **violación grave**
- Un hook importa directamente un repository y ejecuta lógica → **debe ir en use-case**
- Tipos de dominio definidos dentro de `persistence/` → **deben vivir en `domain/`**
- Un adapter/service vive en `components/` → **moverlo a `adapters/`**
- `ports.ts` está en la raíz del módulo en vez de en `domain/` → **moverlo a `domain/ports.ts`**

---

## Estructura canónica de un módulo

```
modules/<feature>/
  domain/
    <entity>.ts        ← tipos + funciones puras (sin side-effects)
    errors.ts          ← clases de error del módulo
    ports.ts           ← interfaces de repositorios y servicios externos
  use-cases/           ← opcional; solo si hay lógica de negocio real
    <action>.ts        ← función pura: recibe port como parámetro, retorna ResultAsync
  persistence/         ← opcional; solo si el módulo persiste datos
    <entity>-drizzle.repository.ts  ← implementa los ports con Drizzle
  adapters/            ← opcional; adapters a APIs del sistema (window, impresión, etc.)
    <service>.adapter.ts
  hooks/               ← opcional; DI + React Query/Zustand binding, sin lógica propia
    use-<feature>.ts
  store/               ← opcional; Zustand store para UI state efímero
    <feature>-store.ts
  components/          ← opcional; UI pura, recibe props y callbacks
    <Feature>.tsx
  lib/                 ← opcional; utilidades puras específicas del módulo
    <helpers>.ts
  index.ts             ← public API del módulo (solo exports intencionales y mínimos)
  README.md            ← descripción, estructura, veredicto y dependencias
```

**Reglas sobre `ports.ts`:**
- Vive SIEMPRE en `domain/ports.ts`, nunca en la raíz del módulo.
- Solo puede ser importado desde `use-cases/`, `persistence/`, y `hooks/`.

**Reglas sobre `index.ts`:**
- Expone solo lo que otros módulos necesitan consumir.
- No re-exporta todo indiscriminadamente. Exports intencionales.

**Módulos que no necesitan todas las capas:**
- Si no hay persistencia (ej: `order`, `settings`) → no necesitan `domain/ports.ts`, `use-cases/`, ni `persistence/`.
- Si solo tiene UI state → alcanza con `store/` + `components/`.

---

## Referencia: módulo `menu` (modelo de referencia)

```
modules/menu/
  domain/
    product.ts         ← type Product, funciones puras (filterProductsByCategory, etc.)
    category.ts        ← type Category
    menu.ts            ← type Menu
    errors.ts          ← MenuDomainError, ProductNotFoundError, etc.
    ports.ts           ← ProductRepository, CategoryRepository, MenuRepository
  use-cases/
    list-products.ts
    list-categories.ts
    list-menus.ts
    create-category.ts
  persistence/
    product-drizzle.repository.ts
    category-drizzle.repository.ts
    menu-drizzle.repository.ts
  hooks/
    use-products.ts
    use-categories.ts
    use-menus.ts
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
  README.md
```

---

## Ejemplo completo: añadir un use-case nuevo

**Escenario:** quiero un use-case `cancelOrder` en el módulo `checkout`.

### 1. Definir el contrato en `domain/ports.ts`

```typescript
// modules/checkout/domain/ports.ts
export interface OrderRepository {
  createOrder(input: CreateOrderInput): ResultAsync<CheckoutOrder, CheckoutPersistenceError>;
  listCustomers(search?: string): ResultAsync<CheckoutCustomer[], CheckoutPersistenceError>;
  getTodayMetrics(): ResultAsync<PosMetrics, CheckoutPersistenceError>;
  // Nuevo:
  cancelOrder(orderId: string): ResultAsync<void, CheckoutPersistenceError>;
}
```

### 2. Escribir el use-case (función pura, sin React)

```typescript
// modules/checkout/use-cases/cancel-order.ts
import type { ResultAsync } from "neverthrow";
import type { CheckoutPersistenceError } from "@/modules/checkout/domain/errors";
import type { OrderRepository } from "@/modules/checkout/domain/ports";

export function cancelOrder(
  repository: OrderRepository,
  orderId: string,
): ResultAsync<void, CheckoutPersistenceError> {
  return repository.cancelOrder(orderId);
}
```

### 3. Implementar en persistence

```typescript
// modules/checkout/persistence/order-drizzle.repository.ts
// Agregar dentro del objeto orderDrizzleRepository:
cancelOrder(orderId: string): ResultAsync<void, CheckoutPersistenceError> {
  return ResultAsync.fromPromise(
    db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, orderId)),
    wrapPersistenceError("Failed to cancel order"),
  ).map(() => undefined);
},
```

### 4. Crear el hook (DI + React binding)

```typescript
// modules/checkout/hooks/use-checkout.ts (agregar):
import { cancelOrder } from "@/modules/checkout/use-cases/cancel-order";

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const result = await cancelOrder(orderDrizzleRepository, orderId);
      if (result.isErr()) throw result.error;
      return result.value;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: CHECKOUT_CUSTOMERS_QUERY_KEY });
    },
  });
}
```

### 5. Usar desde un componente

```typescript
// Solo consume el hook, sin importar nada de domain/persistence directamente
const cancelOrderMutation = useCancelOrder();
<button onClick={() => cancelOrderMutation.mutate(orderId)}>Cancelar</button>
```

**El componente nunca sabe que existe Drizzle, ni neverthrow, ni SQLite.**

---

## Stack de testing

- **Vitest** para unit tests (`.spec.ts`)
- **@testing-library/react** para tests de DOM (`.dom.spec.tsx`, config separada: `vitest.dom.config.ts`)
- Tests co-localizados junto a la implementación
- Las funciones de `domain/` y `use-cases/` son las más fáciles de testear: no necesitan mocks de React ni de BD

Correr tests:
```bash
pnpm test             # unit tests
pnpm test:dom         # DOM tests
```

---

## Módulos actuales y su estado

| Módulo | domain/ | ports.ts | use-cases/ | persistence/ | Notas |
|--------|---------|----------|------------|--------------|-------|
| `menu` | ✅ | `domain/ports.ts` ✅ | ✅ | ✅ | Modelo de referencia |
| `checkout` | ✅ | `domain/ports.ts` ✅ | ✅ | ✅ | Completo |
| `order` | ✅ | — | — | — | Solo domain + Zustand store |
| `settings` | — | — | — | — | Solo UI state + config |
| `feature-flags` | ✅ | `domain/ports.ts` ✅ | ✅ | ✅ | Completo con optimistic updates |

**Shared (cross-cutting):**
- `src/shared/db/` — cliente y schema Drizzle, usados por los repos de todos los módulos
- `src/shared/stores/` — Zustand stores de UI state global (ej: `pos-store.ts`)
- `src/shared/i18n/` — configuración i18n y locales

---

## Plugin/Registry pattern — Módulos autónomos

Cada módulo es independiente. Para registrarse en configuraciones, declara su propio `manifest.ts`. `SettingsModal` no conoce ningún módulo — itera el registry dinámicamente.

### Contrato `ModuleManifest`

```typescript
// modules/settings/domain/module-manifest.ts
export interface ModuleManifest {
  id: string;
  flagKey?: string;                        // si tiene feature flag (clave en la tabla feature_flags)
  settingsPanel?: React.ComponentType;     // si tiene pantalla de configuración propia
  settingsLabel?: string;
  settingsIcon?: LucideIcon;
}
```

### Cómo registrar un módulo nuevo

**1. Crear `src/modules/<modulo>/manifest.ts`:**

```typescript
import { SomeIcon } from "lucide-react";
import type { ModuleManifest } from "@/modules/settings/domain/module-manifest";
import { MiPanel } from "./components/MiPanel";

export const miModuloManifest: ModuleManifest = {
  id: "mi-modulo",
  flagKey: "mi_modulo_enabled",  // opcional
  settingsPanel: MiPanel,         // opcional
  settingsLabel: "Mi Módulo",
  settingsIcon: SomeIcon,
};
```

**2. Agregar al registry en `src/app/module-registry.ts`:**

```typescript
import { miModuloManifest } from "@/modules/mi-modulo/manifest";

export const MODULE_REGISTRY: ModuleManifest[] = [
  // ...existentes
  miModuloManifest,
];
```

**Eso es todo.** No se toca `SettingsModal`. No se toca `App.tsx`. No hay dependencias inversas.

### Regla de dependencias del registry

```
modules/<X>/manifest.ts  →  settings/domain/module-manifest.ts  (solo el contrato)
        ↓
app/module-registry.ts   →  agrupa los manifests
        ↓
App.tsx                  →  pasa registry={MODULE_REGISTRY} a <SettingsModal>
        ↑
settings/components/SettingsModal.tsx  →  itera registry, nunca importa módulos
```

`settings` NUNCA importa desde `menu`, `checkout`, ni ningún otro módulo de negocio.

### Paneles de configuración deben ser autosuficientes

Un `settingsPanel` registrado en el manifest **no recibe props de datos**. Debe obtener lo que necesita via sus propios hooks internamente:

```typescript
// ✅ Correcto — autosuficiente
function MiSettingsPanel() {
  const { data: items = [] } = useMisItems();
  return <div>...</div>;
}

// ❌ Incorrecto — acoplado al caller
function MiSettingsPanel({ items }: { items: Item[] }) { ... }
```

### Feature flags de módulo

Si el módulo tiene `flagKey`, el tab de configuración solo aparece cuando ese flag está activo. El flag se persiste en la tabla `feature_flags` de SQLite y se lee desde `useFeatureFlagsStore`. Para agregar un flag nuevo:

1. Insertar el valor default en `src/modules/feature-flags/store/feature-flags-store.ts` → `DEFAULT_FLAGS`
2. Crear la migración SQL si la tabla necesita el valor inicial (ver sección de migraciones)

---

## Sistema de migraciones de base de datos

Las migraciones SQLite son manejadas **exclusivamente por Tauri** a través del plugin `tauri_plugin_sql` en `src-tauri/src/lib.rs`. No existe ni debe existir un runner de migraciones en TypeScript/JavaScript.

### Cómo funciona

- Tauri ejecuta las migraciones automáticamente al iniciar la app.
- Guarda un **checksum** de cada archivo `.sql` aplicado en la base de datos.
- Si modificás un archivo `.sql` que ya fue aplicado, Tauri falla con: `migration N was previously applied but has been modified`.

### Cómo agregar una nueva tabla/migración

1. **Crear un nuevo archivo `.sql`** en `src-tauri/migrations/` con número secuencial:
   ```
   src-tauri/migrations/0005_system_settings.sql
   ```

2. **Registrar la migración en `src-tauri/src/lib.rs`**:
   ```rust
   Migration {
       version: 5,
       description: "system_settings",
       sql: include_str!("../migrations/0005_system_settings.sql"),
       kind: MigrationKind::Up,
   },
   ```

3. **NO tocar archivos `.sql` anteriores.** Nunca. Si necesitás cambiar algo de una tabla existente, creá una migración nueva (ej: `0006_alter_products_add_column.sql`).

### Regla de oro

> **Una migración aplicada es inmutable.** Si la tocás, rompés la base de datos de los usuarios que ya la tienen.

### Caso real que ocurrió en el proyecto

Se agregó la tabla `system_settings` al schema TypeScript (`src/shared/db/schema.ts`) pero se omitió la migración SQL. Al intentar leer/escribir settings, la app fallaba con `no such table: system_settings`. La solución fue crear la migración `0005_system_settings.sql` y registrarla en `lib.rs` — **no modificar migraciones existentes ni agregar un runner en TypeScript**.
