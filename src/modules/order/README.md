# Módulo: order

## Responsabilidad

Gestiona el estado local del carrito de compras durante una sesión POS: agregar/quitar productos, modificar cantidades y calcular totales. No persiste nada — su ciclo de vida es la sesión en memoria.

**Vale la pena tenerlo:** Si, aunque es pequeño. Centralizar la lógica del carrito en un módulo propio evita que esa lógica se disperse en el componente POS o en checkout.

---

## Estructura

```
order/
  domain/
    cart.ts          ← tipos CartItem, CartTotals + funciones puras
  store/
    order-store.ts   ← Zustand store
  components/
    Cart.tsx         ← UI del carrito
  index.ts           ← export { Cart }
```

---

## Dominio (`domain/cart.ts`)

### Tipos

```ts
interface CartItem {
  product: Product   // importado de menu/domain/product
  quantity: number
}

interface CartTotals {
  subtotal: number
  total: number
  itemCount: number
}
```

### Funciones puras

```ts
calculateCartTotals(items: CartItem[]): CartTotals
addItemToCart(items: CartItem[], product: Product): CartItem[]
incrementItemQuantity(items: CartItem[], productId: string): CartItem[]
decrementItemQuantity(items: CartItem[], productId: string): CartItem[]
removeItemFromCart(items: CartItem[], productId: string): CartItem[]
```

Todas son funciones puras: reciben el estado actual, retornan el nuevo estado. No mutan nada.

---

## Store (`store/order-store.ts`)

Zustand store `useOrderStore`:

| Estado | Descripción |
|--------|-------------|
| `currentOrder` | `CartItem[]` — items del carrito activo |

| Acción | Descripción |
|--------|-------------|
| `addItem(product)` | Agrega producto o incrementa cantidad si ya existe |
| `incrementItem(productId)` | +1 unidad |
| `decrementItem(productId)` | -1 unidad (elimina si llega a 0) |
| `removeItem(productId)` | Elimina el item |
| `clear()` | Vacía el carrito (se llama después de confirmar checkout) |

El store delega toda la lógica a las funciones puras de `domain/cart.ts`.

---

## Componentes

`Cart.tsx`: renderiza la lista de items del carrito con controles de cantidad (+/-/remove), muestra subtotal/total, y tiene el botón para abrir el modal de checkout. Recibe callbacks para las acciones del store.

---

## Dependencias entre módulos

- **Importa de `menu`:** `Product` (domain/product) — para tipar los items del carrito.
- **Exporta hacia `checkout`:** `CartItem`, `calculateCartTotals` — checkout los necesita para construir el `CreateOrderInput`.
- **Exporta hacia `pos`:** `Cart` componente — el POS lo monta en el panel lateral.

---

## Tests

No hay tests unitarios en este módulo al momento. Las funciones puras de `domain/cart.ts` son las más fáciles de testear del sistema (entrada → salida, sin mocks). Es la deuda técnica más clara del módulo.

---

## Veredicto

Módulo **justificado pero incompleto en cobertura**. La separación de responsabilidades es correcta: lógica pura en domain, estado en store, presentación en componente. La dependencia domain → domain con `menu` (importar `Product`) es el único acoplamiento a considerar — funciona bien mientras `Product` no cambie de módulo.

**Deuda pendiente:** agregar tests unitarios para las funciones puras de `domain/cart.ts`.
