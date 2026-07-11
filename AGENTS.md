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

El módulo más complejo del sistema. Cubre el catálogo completo (productos, categorías, menús) **y** la personalización de productos vía modifier groups.

```
modules/menu/
  domain/
    product.ts              ← type Product + funciones puras
    category.ts             ← type Category
    menu.ts                 ← type Menu
    modifier-group.ts       ← types ModifierGroup, ModifierOption, SelectedModifier
                             ← funciones puras: resolveProductModifierGroups, buildCartItemKey
    errors.ts               ← MenuDomainError + específicos
    ports.ts                ← ProductRepository, CategoryRepository, MenuRepository, ModifierGroupRepository
  use-cases/                ← 15 use-cases: CRUD de products/categories/menus,
                             ← CRUD de modifier groups, batch queries, assign/unassign
  persistence/              ← 4 repos Drizzle
    product-drizzle.repository.ts
    category-drizzle.repository.ts
    menu-drizzle.repository.ts
    modifier-group-drizzle.repository.ts   ← CRUD + listByXIds (batch, 2 SQL queries para N) + listXAssignments
  hooks/                    ← 6 archivos: use-menus, use-categories, use-products,
                             ← use-filtered-products, use-modifier-groups (central),
                             ← use-product-modifier-groups-map.dom.spec.tsx (performance contract)
  store/                    ← menu-store.ts (Zustand: product search query)
  components/
    ProductGrid.tsx         ← grid del POS con badge de modificadores
    ProductSearch.tsx
    ProductCustomizationDialog.tsx  ← dialog de personalización (hero, chips, sticky footer)
    CategoryNav.tsx
    MenuSelector.tsx
    admin/
      ProductSettingsPanel.tsx
      CategorySettingsPanel.tsx
      MenuSettingsPanel.tsx
      ModifierGroupSettingsPanel.tsx  ← usa OptionsEditor embebido
      OptionsEditor.tsx               ← sub-componente aislado, CRUD de opciones
  lib/
    product-price.ts
    modifier-price.ts        ← calculateItemUnitPrice(product, modifiers)
  manifest.ts               ← 4 ModuleManifest (uno por sub-panel admin)
  index.ts
  README.md                  ← descripción detallada, modelo, performance contract, changelog
```

**Performance contract:** `useProductModifierGroupsMap(products)` hace **2 SQL queries totales** sin importar la cantidad de productos (no 2N). El test `use-product-modifier-groups-map.dom.spec.tsx` lo garantiza.

**Feature flag:** `modifier_groups_enabled` en `feature_flags`. Cuando está off, el POS no muestra badges ni dispara el dialog.

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

**TDD estricto es mandatorio.** Ver `CONTRIBUTING.md` sección "TDD is mandatory" para el ciclo Red → Green → Refactor. La versión corta:

1. **RED**: Escribí tests para el comportamiento NUEVO. Correlos. Deben fallar. Un test que nunca falla prueba nada.
2. **GREEN**: Escribí el código MÍNIMO para que pasen. Nada más.
3. **REFACTOR**: Limpiá mientras los tests sigan verde.

**No romper tests viejos al refactorizar UI:** Cuando refinás un componente, los tests existentes (los que prueban el comportamiento viejo) deben seguir pasando. Agregá un nuevo `describe` con tests para el comportamiento nuevo **al final** del spec, no modifiques los viejos. Mantené los mismos `data-testid` / `getByRole` / `getByLabelText` que el spec viejo espera.

**Test de i18n como guard de regresión:** El test `src/shared/i18n/locale-completeness.spec.ts` (12 tests) verifica que **cada locale tenga las mismas keys que `es-MX`**. Si agregás una key a `es-MX`, propagá a los 4 locales restantes, o el test falla. Es un guard permanente.

---

## Módulos actuales y su estado

| Módulo | domain/ | ports.ts | use-cases/ | persistence/ | Notas |
|--------|---------|----------|------------|--------------|-------|
| `menu` | ✅ | `domain/ports.ts` ✅ | ✅ (15) | ✅ (4 repos) | Modelo de referencia. Incluye modifier groups + dialog + OptionsEditor + batch queries. Feature flag: `modifier_groups_enabled`. Manifest con 4 sub-paneles admin. |
| `checkout` | ✅ | `domain/ports.ts` ✅ | ✅ | ✅ | Completo |
| `order` | ✅ | — | — | — | Domain + Zustand store. El `CartItem` incluye `selectedModifiers: SelectedModifier[]` (importado de `menu/domain/modifier-group`) |
| `settings` | — | — | — | — | Solo UI state + config. Define el contrato `ModuleManifest` que el resto usa |
| `feature-flags` | ✅ | `domain/ports.ts` ✅ | ✅ | ✅ | Completo con optimistic updates |
| `delivery` | ✅ | `domain/ports.ts` ✅ | ✅ (3) | ✅ | Repartidores + corte por entrega. Feature flag: `delivery_enabled` |
| `shift-reports` | ✅ | `domain/ports.ts` ✅ | ✅ (7) | ✅ | Turnos de venta (abrir/cerrar/listar historial) + métricas. Feature flag: `shift_management_enabled` |
| `updater` | ✅ | — | — | — (usa adapter) | Actualizaciones de Tauri. No persiste; consume el updater de Tauri via adapter en `adapters/`. Tiene `store/` para el estado del chequeo/descarga |

**Shared (cross-cutting):**
- `src/shared/db/` — cliente y schema Drizzle, usados por los repos de todos los módulos
- `src/shared/stores/` — Zustand stores de UI state global (ej: `pos-store.ts`)
- `src/shared/i18n/` — configuración i18n y locales
  - **Convención de i18n:** Cada locale (`en-US`, `es-AR`, `es-ES`, `es-MX`, `pt-BR`) debe tener las **mismas keys** que `es-MX` (la fuente de verdad). El test `src/shared/i18n/locale-completeness.spec.ts` valida esto estructuralmente: si agregás una key a `es-MX`, tenés que propagarla a los otros 4 locales, o el test falla. Es un guard permanente.

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

**Flags actuales** (defaults en `feature-flags-store.ts`):

| Key | Default | Módulo | Efecto |
|-----|---------|--------|--------|
| `categories_enabled` | `false` | `menu` | Muestra la navegación de categorías en el POS |
| `multiple_menus_enabled` | `false` | `menu` | Muestra el selector de menú + panel de gestión de menús |
| `delivery_enabled` | `false` | `delivery` | Habilita módulo de repartidores y corte por entrega |
| `shift_management_enabled` | `false` | `shift-reports` | Habilitar apertura y cierre de turnos de venta |
| `auto_update_enabled` | `true` | `updater` | Habilita el chequeo y descarga automática de updates de Tauri |
| `modifier_groups_enabled` | `false` | `menu` | Activa el dialog de personalización y los badges en el POS |

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

---

## Sistema de actualizaciones (Tauri updater) — firma y llaves

La `pubkey` del updater en `src-tauri/tauri.conf.json` se compila **dentro del binario en build-time**. No es un valor que se lea en runtime desde un servidor ni desde config remota: queda embebido en cada instalación existente el día que se compiló esa versión.

### Cómo funciona

- Cada release se firma con una clave privada (`TAURI_SIGNING_PRIVATE_KEY`, secret de GitHub Actions) que produce un archivo `.sig` por artefacto.
- El binario instalado en la máquina del usuario valida esa firma contra la `pubkey` que quedó compilada dentro de él al momento del build.
- Si la `pubkey` compilada no corresponde criptográficamente a la clave privada que firma los releases, el updater rechaza CUALQUIER actualización con un error de firma — sin importar qué tan reciente sea la versión candidata.
- Rotar la `pubkey` en el repo **no actualiza nada retroactivamente**: toda instalación existente sigue con la `pubkey` vieja compilada hasta que un update válido logre instalarse. Si la rotación deja la config en un estado inconsistente, el auto-update queda huérfano para esas instalaciones — no hay forma remota de corregirlo salvo que el usuario reinstale manualmente.

### Regla de oro

> La `pubkey` y el secret `TAURI_SIGNING_PRIVATE_KEY` **nunca se rotan** sin coordinar antes un aviso a usuarios. Y cualquier cambio a la `pubkey` **debe verificarse con una prueba de round-trip antes de publicar**: firmar un archivo con la clave privada candidata y comparar el `key_id` real —los bytes `[2:10]` de la estructura minisign decodificada en base64, no el texto del comentario del archivo `.pub`— contra el `key_id` real de la pubkey candidata. Si no coinciden byte a byte, **no se publica**.

### Caso real que ocurrió en el proyecto

Entre los commits `522f478` y `93abc36` (2026-06-23) se rotó la keypair de firma dos veces en 20 minutos. La `pubkey` que quedó en `tauri.conf.json` tenía un comentario de texto que decía `4D64CCE2FA5847A3`, pero sus bytes reales correspondían a una clave distinta (`4D64CCE2FA584763`) — nadie verificó los bytes reales contra la firma real, solo se comparó visualmente el texto del comentario. El auto-update estuvo roto para todas las versiones v0.2.2 a v0.2.6 (2026-06-23 a 2026-06-30) sin que ningún build fallara — el error solo aparecía en runtime para el usuario final, como `The signature was created with a different key than the one provided`. La solución fue generar un keypair nuevo desde cero y verificarlo con round-trip antes de publicar (ver commit que corrige `src-tauri/tauri.conf.json` en esta misma fecha).
