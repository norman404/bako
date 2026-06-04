# Módulo `delivery`

Gestión de repartidores para el POS. Permite crear, editar y archivar repartidores, asignarlos a órdenes en el checkout, y generar un corte diario de ventas por repartidor.

## Estructura

```
modules/delivery/
  domain/
    delivery-person.ts   ← tipos DeliveryPerson, DeliveryPersonCut, DeliveryPersonCutRow
    errors.ts            ← DeliveryPersonError, DeliveryPersonNotFoundError
    ports.ts             ← DeliveryPersonRepository, DeliveryPersonCreateInput
  use-cases/
    list-delivery-persons.ts
    create-delivery-person.ts
    get-today-delivery-cut.ts
  persistence/
    delivery-person-drizzle.repository.ts   ← implementa DeliveryPersonRepository con Drizzle
  hooks/
    use-delivery-persons.ts   ← React Query hooks + query keys
  components/
    DeliveryPersonSelect.tsx          ← selector autosuficiente para uso en checkout
    admin/
      DeliveryPersonSettingsPanel.tsx ← CRUD de repartidores (panel de settings)
      DeliveryCutPanel.tsx            ← corte del día por repartidor
  manifest.ts   ← registra los paneles en el MODULE_REGISTRY
  index.ts      ← public API del módulo
```

## Dependencias

- `neverthrow` — manejo de errores como valores en use-cases y repository
- `drizzle-orm` — persistence layer (tabla `delivery_persons`, lecturas de `orders`)
- `@tanstack/react-query` — data fetching y mutations en hooks
- `react-i18next` — i18n en componentes (namespace `delivery`)
- `lucide-react` — ícono `Bike` para los manifests

## Activación

El módulo requiere el feature flag `delivery_enabled` en la tabla `feature_flags`. Cuando el flag está activo, los paneles de configuración ("Repartidores" y "Corte repartidores") aparecen automáticamente en `SettingsModal` a través del registry.

Para activar en desarrollo: insertar o actualizar el flag en la BD:

```sql
UPDATE feature_flags SET enabled = 1 WHERE key = 'delivery_enabled';
```

O agregar el default en `DEFAULT_FLAGS` del feature-flags-store.

## Corte del día

`DeliveryCutPanel` llama `getTodayCut()` en el repository, que hace un JOIN entre `orders` y `delivery_persons` filtrando órdenes del día actual (medianoche a medianoche). Lee la tabla `orders` del schema compartido en `src/shared/db/schema.ts`.

El corte siempre se marca `staleTime: 0` — el usuario puede forzar un refresh con el botón "Actualizar".

## Uso de `DeliveryPersonSelect`

Componente autosuficiente para asignar repartidor en el checkout:

```tsx
import { DeliveryPersonSelect } from "@/modules/delivery";

<DeliveryPersonSelect
  value={deliveryPersonId}
  onChange={(id) => setDeliveryPersonId(id)}
/>
```

Incluye alta rápida inline para crear un repartidor sin salir del flujo de venta.
