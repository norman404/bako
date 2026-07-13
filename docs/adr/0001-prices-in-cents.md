# ADR-0001: Precios en centavos enteros

## Status

Accepted

## Context

Bako es un punto de venta (POS) que maneja dinero: precios de productos, recargos por opciones de modificadores, y totales de órdenes. Necesitamos una representación de precios que:

- Evite errores de redondeo de punto flotante.
- Mantenga la aritmética simple y exacta.
- Se serialice limpio hacia y desde SQLite.
- Sea consistente en todo el dominio (`menu`, `checkout`, `order`).

## Decision

**Todos los precios en el dominio se almacenan como enteros no negativos que representan centavos.**

Esto aplica a:

- `Product.price`
- `ModifierOption.priceDelta`
- `SelectedModifier.priceDelta` / `CartItemModifier.priceDelta`
- Cualquier otro campo de precio que aparezca en el dominio

Los inputs de UI deben mostrar **unidades monetarias** al usuario (`15`, `15.50`, `15,50`) y **parsear a centavos** antes de persistir. Al mostrar un valor guardado, se debe formatear de centavos a unidades monetarias.

## Alternatives considered

1. **Números de punto flotante (`number` representando pesos)**
   - Rechazado: introduciría errores de redondeo en sumas, multiplicaciones por cantidad, y comparaciones.
2. **Cadenas decimales (`string` representando pesos)**
   - Rechazado: complicaría los cálculos, los mapeos de ORM, y las validaciones de dominio. No resolvería el problema de la aritmética.

## Consequences

- (+) La aritmética es exacta.
- (+) SQLite almacena enteros nativamente.
- (+) El dominio puede validar fácilmente que los precios sean enteros no negativos.
- (-) Cada input de precio en la UI necesita un parser/formatter.
- (-) Nuevos desarrolladores y agentes deben ser recordados de no tratar un número crudo ingresado por el usuario como centavos.

## Agent guidance

- Usar siempre `formatProductPriceInput()` y `parseProductPriceInput()` de `modules/menu/lib/product-price.ts` para cualquier input de precio.
- **Nunca** aceptar un número crudo de un input de UI y tratarlo como centavos: si el usuario escribe `15`, eso significa `$15.00` → `1500` centavos.
- Si se agrega un nuevo campo de precio, reutilizar los mismos helpers o pedir una revisión de ADR.
- Este ADR rige cualquier input en el frontend; el dominio y la persistencia solo ven centavos.

## Related

- `src/modules/menu/lib/product-price.ts`
- `src/modules/menu/components/admin/ProductSettingsPanel.tsx`
- `src/modules/menu/components/admin/OptionsEditor.tsx`
- `src/modules/menu/persistence/modifier-group-drizzle.repository.ts`
- `src/modules/menu/persistence/product-drizzle.repository.ts`
