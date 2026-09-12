# Pedidos de Uber y DiDi

## Operación

1. En el carrito, selecciona **Uber Eats** o **DiDi**. El folio de la app es opcional y se conserva separado del nombre del pedido.
2. Agrega los productos y usa **Guardar e imprimir etiquetas**. El pedido queda pendiente, sin pago ni venta confirmada. Las etiquetas incluyen la plataforma y el folio (o el número de Bako si no hay folio).
3. Abre **Delivery** en la barra del POS. Incluye los pendientes de todos los turnos, también después de reiniciar Bako.
4. Selecciona **Efectivo en caja** o **Pagado en app**. No se propone un método por defecto.
5. Confirma. Captura el **importe final** solo en **Efectivo en caja**: si el repartidor entrega $150, se registran $150 y los precios del catálogo no determinan ese importe. En **Pagado en app** no se captura importe: la venta conserva el total de catálogo y el cobro de la app queda en 0, para no tener que consultarlo en la app.

El efectivo se confirma cuando el repartidor lo entrega en caja, no cuando después cobra al cliente. Un pago en app no se suma a efectivo ni a la terminal de tarjetas, y tampoco equivale a una liquidación bancaria de la plataforma.

Los pendientes permiten reimprimir etiquetas o anular el pedido. Una falla de impresión no elimina el pedido ni genera otro cobro; se reimprime desde el mismo registro. La impresión usa la configuración actual de comandas e impresoras por categoría.

## Cortes y métricas

- Un pendiente no suma a ventas, productos vendidos, métodos de pago ni efectivo esperado.
- Una confirmación se contabiliza en el turno activo de confirmación, conservando también el turno de creación del pedido.
- El cierre conserva la lista de pendientes que existía en ese momento. Una confirmación o anulación posterior no cambia esa lista ni los importes del corte anterior.
- Si la gestión de turnos está desactivada, el pedido se registra sin turno y sigue apareciendo en las métricas por su fecha de confirmación.
- Las ventas confirmadas se desglosan por Local, Uber Eats y DiDi; los deliveries además se desglosan por método (Efectivo y Pagado en app) en el corte. Los cobros en 0, como el pago de app, no se muestran en el reporte ni en el dashboard. Los desgloses monetarios por producto y categoría corresponden solo a ventas locales: no se inventan precios de delivery para repartir un importe.
- La rentabilidad compara importes registrados con costos de productos; no calcula comisiones, promociones ni liquidaciones de la app.
- Los deliveries no usan el editor de ventas locales. Una confirmación no puede repetirse y un delivery confirmado de un turno cerrado no puede anularse desde el sistema. Una corrección con devolución de dinero requiere un flujo explícito de ajuste, no editar silenciosamente un corte cerrado.

## Persistencia

La migración `0032_delivery_orders.sql` agrega a `orders`:

- `channel`: `local`, `uber` o `didi`.
- `delivery_reference`: folio opcional.
- `confirmed_at`: nulo mientras el delivery está pendiente.
- `financial_shift_id`: turno donde se reconoce el importe confirmado; `shift_id` conserva el origen.

En pendientes, `orders.total` es cero y no existe un pago. Los productos conservan sus precios de referencia y costos. Al confirmar, `total` recibe el importe cobrado y se inserta un único pago `cash` o `platform` en la misma transacción. En `cash` el importe es el capturado por el cajero. En `platform` la venta conserva la suma de `unit_price × quantity` del pedido, pero el pago `platform` se registra en 0: no entra a caja ni a la terminal y no depende de lo que reporte la app.

La migración `0033_payments_platform.sql` recrea `payments` para aceptar `cash`, `card` y `platform` como método, conservando los pagos existentes. Sin ella, insertar un pago `platform` violaba el `CHECK` original de la tabla.

Los pedidos anteriores conservan sus importes y pagos: se migran como locales confirmados en su fecha y turno originales. No se intenta inferir cuáles fueron pedidos históricos de plataformas.

`shifts.delivery_pending_ids` conserva la lista de pendientes al cierre. Esto evita depender de timestamps que pueden coincidir en el mismo milisegundo. Confirmación, anulación y cierre se serializan mediante `withTransaction()`; la validación del estado y del turno ocurre dentro de la transacción.
