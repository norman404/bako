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
domain ← ports ← use-cases ← persistence
                            ↑
                           hooks  (inyectan persistence, llaman use-cases)
                            ↑
                         components  (solo UI, reciben callbacks)
```

- `domain/` no importa nada del proyecto (solo shared-kernel / `src/lib/`)
- `ports.ts` depende solo de `domain/`
- `use-cases/` depende solo de `ports.ts` y `domain/`
- `persistence/` implementa los ports de `domain/`, importa de `domain/` y `shared/db/`
- `hooks/` inyecta el repositorio concreto y llama los use-cases
- `components/` solo UI: recibe datos y callbacks, sin lógica de negocio

### Señales de que algo está mal

- Un archivo en `domain/` importa desde `hooks/`, `store/`, o `persistence/` → **violación grave**
- Un hook importa directamente un repository y ejecuta lógica → **debe ir en use-case**
- Tipos de dominio definidos dentro de `persistence/` → **deben vivir en `domain/`**
- Un adapter/service vive en `components/` → **moverlo a `adapters/`**

---

## Estructura de un módulo

```
modules/<feature>/
  domain/
    <entity>.ts        ← tipos + funciones puras (sin side-effects)
    errors.ts          ← clases de error del módulo
    ports.ts           ← interfaces de repositorios y servicios externos
  use-cases/
    <action>.ts        ← función pura: recibe port como parámetro, delega
  persistence/
    <entity>-drizzle.repository.ts  ← implementa los ports con Drizzle
  adapters/
    <service>.adapter.ts  ← adapters a APIs del sistema (window, impresión, etc.)
  hooks/
    use-<feature>.ts   ← DI + React Query/Zustand binding, sin lógica propia
  components/
    <Feature>.tsx      ← UI pura, recibe props y callbacks
  lib/
    <helpers>.ts       ← utilidades puras específicas del módulo
  index.ts             ← public API del módulo (solo exports intencionales)
```

No todas las carpetas son obligatorias. Si el módulo no tiene adapters externos, no necesita `adapters/`. Si es solo UI state, alcanza con `store/`.

---

## Referencia: módulo `menu` (el más completo)

```
modules/menu/
  domain/
    product.ts         ← type Product, funciones puras
    category.ts        ← type Category
    errors.ts          ← MenuDomainError
    ports.ts           ← ProductRepository, CategoryRepository (interfaces)
  use-cases/
    list-products.ts
    list-categories.ts
    create-category.ts
  persistence/
    product-drizzle.repository.ts
    category-drizzle.repository.ts
  hooks/
    use-products.ts
    use-categories.ts
```

---

## Ejemplo completo: añadir un use-case nuevo

**Escenario:** quiero un use-case `cancelOrder` en el módulo `checkout`.

### 1. Definir el contrato en `ports.ts` (si no existe)

```typescript
// modules/checkout/ports.ts
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
import type { OrderRepository } from "@/modules/checkout/ports";

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
| `menu` | ✅ | ✅ | ✅ | ✅ | Modelo de referencia |
| `checkout` | ✅ | ✅ | ✅ | ✅ | Completo |
| `order` | ✅ | — | — | — | Solo domain + Zustand store |
| `pos` | — | — | — | — | Solo UI state (correcto así) |
| `turno` | — | — | — | — | Consume use-cases de checkout |
| `settings` | — | — | — | — | Solo UI state + config |
