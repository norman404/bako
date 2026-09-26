# Promociones y productos compuestos

Se activan en **Configuración → Características → Promociones** (`promotions_enabled`, apagado por defecto).

## Operación

- **Lleva N, paga M** (2x1, 3x2): aplica a productos específicos o a cualquier producto de una categoría. Siempre sale gratis la unidad más barata del grupo.
- **Paquete a precio fijo**: una lista de productos con cantidad (A + B + C = $100). Se detecta sola cuando el carrito los contiene; nunca se aplica si el precio del paquete no es menor que comprarlos por separado.
- **Horario**: días de la semana y rango de horas, con uno o varios bloques y fechas de vigencia opcionales. Un fin a las 00:00 significa hasta la medianoche; un fin anterior al inicio (22:00 a 02:00) cruza la medianoche y pertenece al día en que empieza.
- **Producto compuesto**: se configura en **Catálogo → Productos** marcando *Producto compuesto* y agregando sus productos incluidos. Dentro de su horario se vende como una línea al precio del compuesto, con sus productos debajo. Fuera de horario, elegirlo agrega los productos por separado a su precio normal. Sin horario, siempre aplica el precio del compuesto.

Todo es automático: el cajero no aplica ni quita promociones. La vigencia se decide con **la hora en que se agregó cada unidad**, no con la hora de cobro. Un Latte agregado a las 17:59 conserva una promoción que terminó a las 18:00; uno agregado a las 18:01 ya no entra. Lo mismo aplica al botón "+" de un compuesto: fuera de horario agrega los productos por separado.

Cuando varias promociones compiten por los mismos productos, se aplica la combinación que da **el total más bajo al cliente**. El resultado es determinista: el mismo carrito siempre da el mismo precio.

Las promociones y el descuento de los compuestos solo aplican a ventas **locales**. En Uber y DiDi el compuesto se registra con sus productos a precio de lista, porque el importe final se confirma después.

## Evidencia

Cada venta guarda una fila en `order_promotions` por promoción aplicada, con el nombre, la regla completa (`rule_snapshot`, incluido el horario) y el descuento, congelados al momento de la venta. Editar o eliminar la promoción después no cambia ventas pasadas. Eliminar una promoción la marca con `deleted_at`, sin borrarla.

- El **ticket** muestra, bajo cada línea, el descuento que le corresponde, los productos de un compuesto, y al final el subtotal y una línea por promoción. Las líneas impresas, menos los descuentos, suman el total cobrado. La reimpresión usa la evidencia guardada.
- El **corte de turno** incluye la sección **Promociones**: veces aplicada y descuento total por promoción, solo de ventas confirmadas y no anuladas. También se imprime en la reimpresión del corte.
- Las **ventas por categoría** y los **productos más vendidos** usan el importe neto de cada línea: el descuento de un 2x1 en bebidas no se reparte sobre la comida del mismo pedido.

## Editar una venta con promociones

El editor de ventas vuelve a calcular las promociones con **las reglas congeladas en esa venta**, no con la configuración actual, y toma la hora de la venta como hora de cada unidad. Si al quitar productos una promoción deja de aplicar, su descuento y su evidencia desaparecen. Un compuesto conserva su ahorro por unidad. La evidencia se reescribe en la misma transacción que las líneas y los pagos.

## Persistencia

La migración `0034_promotions.sql` agrega:

- `promotions` y `promotion_targets`: reglas NxM y de paquete. Los `CHECK` impiden, entre otros casos, un NxM que cobra todo (`pay_quantity < buy_quantity`) o un target sin producto ni categoría.
- `products.kind` (`standard` | `composite`), `products.availability_schedule` y `product_components`. Un compuesto solo puede contener productos normales activos.
- `order_promotions`: la evidencia por venta.
- En `order_items`: `discount_amount`, `order_promotion_id` y `parent_order_item_id`.

El precio se guarda como **precio de lista + descuento explícito**, nunca con el descuento incluido en `unit_price`:

```
línea neta   = unit_price × quantity − discount_amount
orders.total = Σ línea neta
```

La línea padre de un compuesto guarda como `unit_price` la suma de sus componentes, y como `discount_amount` la diferencia contra el precio del compuesto. Sus hijos se guardan con precio y costo 0; solo sirven para cocina y para el detalle. El costo del padre es la suma de los costos de sus componentes.

Si una promoción cubre solo parte de una línea del carrito, la línea se guarda en varias `order_items`: por ejemplo, 3 Lattes con un 2x1 quedan como 2 con descuento y 1 a precio normal. Cada una pertenece a una sola promoción, como máximo. El checkout rechaza cualquier descuento que no esté respaldado por su promoción, o cuya suma no coincida con la registrada en `order_promotions`.
