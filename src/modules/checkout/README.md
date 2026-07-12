# Módulo: checkout

## Responsabilidad

Gestiona el flujo completo de venta: desde recibir los items del carrito hasta crear la orden en la base de datos, procesar el pago, asignar un cliente y emitir el ticket imprimible.

**Vale la pena tenerlo:** Si. Es el core de negocio del POS. Sin este módulo no hay ventas.

---

## Estructura

```
checkout/
  domain/
    order.ts          ← tipos y funciones puras del dominio
    errors.ts         ← CheckoutPersistenceError
    metrics.ts        ← tipos de métricas del turno (PosMetrics)
    ports.ts          ← interfaz OrderRepository
  use-cases/
    create-order.ts
    list-customers.ts
    get-today-metrics.ts
  persistence/
    order-drizzle.repository.ts
  hooks/
    use-checkout.ts       ← React Query bindings
    use-checkout-form.ts  ← estado del formulario de checkout
  adapters/
    print-ticket.adapter.ts
  components/
    CheckoutModal.tsx
    CheckoutModal.*.tsx   ← subcomponentes del modal
  lib/
    builders.ts
    formatters.ts
  index.ts              ← export { CheckoutModal }
```

---

## Dominio

### Tipos clave (`domain/order.ts`)

| Tipo | Descripción |
|------|-------------|
| `CheckoutOrder` | Orden completa con items, pagos y cliente opcional |
| `CreateOrderInput` | Payload para crear una orden |
| `CheckoutCustomer` | Cliente asociado a una orden |
| `CheckoutPaymentInput` | Método y monto del pago |
| `CHECKOUT_PAYMENT_METHOD` | Enum: `cash` / `card` |
| `CHECKOUT_FULFILLMENT_TYPE` | Enum: `local` / `delivery` |

**Función pura clave:**
```ts
calculateOrderTotal(items: CheckoutOrderItemInput[]): number
```

### Métricas (`domain/metrics.ts`)

Tipos `PosMetrics`, `PosMetricsPaymentBreakdown`, `PosMetricsTopProduct` — usados por el turno para mostrar el resumen del día.

---

## Port

```ts
// ports.ts
interface OrderRepository {
  createOrder(input: CreateOrderInput): ResultAsync<CheckoutOrder, CheckoutPersistenceError>
  listCustomers(search?: string): ResultAsync<CheckoutCustomer[], CheckoutPersistenceError>
  getTodayMetrics(): ResultAsync<PosMetrics, CheckoutPersistenceError>
}
```

---

## Use-cases

Los tres use-cases son funciones puras que reciben el repositorio como parámetro (DI manual):

```ts
createOrder(repository: OrderRepository, input: CreateOrderInput)
listCustomers(repository: OrderRepository, search?: string)
getTodayMetrics(repository: OrderRepository)
```

No tienen lógica propia más allá de delegar al repo — la validación y normalización viven en la capa de persistencia.

---

## Persistence

`order-drizzle.repository.ts` implementa `OrderRepository` con Drizzle + SQLite.

- `createOrder`: transacción que crea (opcionalmente) un cliente, la orden, los items y el pago.
- `listCustomers`: búsqueda por patrón o recientes si no hay query.
- `getTodayMetrics`: agrega ventas del día con breakdown por método de pago y top productos.

Incluye validaciones de input (`validateCreateOrderInput`, `validatePaymentInput`) y helpers de mapeo row ↔ domain.

---

## Hooks

### `useCustomers(search?)`
React Query query. Llama `listCustomers` con debounce implícito en el formulario.

### `useCreateOrder()`
`useMutation`. Llama `createOrder`, invalida queries de customers y métricas al resolver.

### `useCheckoutForm()`
Hook de estado del formulario de checkout. Maneja:
- Tipo de entrega (fulfillment) y modo de cliente
- Método de pago y monto recibido
- Cálculo de vuelto (`computeChangeAmount`)
- Validación para habilitar el botón de confirmar (`computeIsDisabled`)
- Construcción del `CreateOrderInput` final

---

## Adapters

`print-ticket.adapter.ts` — `printOrder(options)`: normaliza `PrintOrderOptions` a un payload serializable y lo envía al comando `print_ticket` de Tauri. El payload incluye los items con sus modifiers (grupo, opción y valor de texto) para que el backend Rust genere el ticket físico.

---

## Componentes

`CheckoutModal` es el componente raíz del flujo de venta. Se compone de:

- `CheckoutModal.OrderSummary` — lista de items del carrito con totales
- `CheckoutModal.Fulfillment` — selector dine-in / takeaway / delivery + búsqueda/creación de cliente
- `CheckoutModal.Payment` — selector de método de pago, input de monto, resumen de vuelto
- `CheckoutModal.Footer` — botón de confirmar y botón de imprimir ticket

---

## Tests

| Archivo | Qué cubre |
|---------|-----------|
| `lib/builders.spec.ts` | Construcción del payload CreateOrderInput |
| `lib/formatters.spec.ts` | Parsing y formateo de montos |
| `adapters/print-ticket.adapter.spec.ts` | Normalización del payload enviado a Tauri, incluyendo modifiers |
| `hooks/use-checkout-form.spec.ts` | Cálculos del formulario (vuelto, validación) |
| `components/CheckoutModal.dom.spec.tsx` | Integración DOM del modal |

---

## Dependencias entre módulos

- **Consume de `order`:** `CartItem`, `calculateCartTotals` — para recibir el carrito y calcular totales.
- **Exporta hacia `turno`:** `getTodayMetrics` + `orderDrizzleRepository` — el módulo turno los reutiliza para métricas del día.
- **Exporta hacia `pos`:** `CheckoutModal` — el POS lo monta cuando el usuario confirma el carrito.

---

## Veredicto

Módulo **completo y justificado**. Tiene todas las capas (domain → ports → use-cases → persistence → hooks → UI). Es el módulo más importante del sistema y su separación de responsabilidades es correcta.

Lo único a considerar: las validaciones de negocio (`validateCreateOrderInput`) viven en la capa de persistencia en lugar del dominio. Funcionalmente no es un problema, pero si la lógica crece conviene moverlas a `domain/` o a los use-cases.
