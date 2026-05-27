# Módulo: turno

## Responsabilidad

Muestra el resumen del turno activo: total de ventas, cantidad de tickets, desglose por método de pago y productos más vendidos del día. Hace polling cada 10 segundos para mantener los datos frescos.

**Vale la pena tenerlo:** Si. Encapsula la presentación de métricas del turno en un componente reutilizable. Su responsabilidad está bien acotada.

---

## Estructura

```
turno/
  components/
    TurnoSummaryPanel.tsx    ← UI del resumen del turno
  hooks/
    use-turno-metrics.ts     ← React Query con polling
  index.ts                   ← export { TurnoSummaryPanel }
```

---

## Hook (`hooks/use-turno-metrics.ts`)

```ts
useTurnoMetrics(): {
  data: TurnoMetrics | undefined
  isLoading: boolean
  isError: boolean
}
```

- Llama `getTodayMetrics(orderDrizzleRepository)` — use-case del módulo `checkout`.
- `refetchInterval: 10_000` — actualiza automáticamente cada 10 segundos.
- Re-exporta `PosMetrics` como `TurnoMetrics` (alias semántico).

**El módulo no tiene persistencia propia.** Delega completamente a `checkout`.

---

## Componente (`components/TurnoSummaryPanel.tsx`)

Panel que renderiza:

| Sección | Contenido |
|---------|-----------|
| Resumen general | Total vendido, cantidad de órdenes |
| Medios de pago | Breakdown de efectivo / tarjeta / transferencia |
| Top productos | Ranking de productos más vendidos en el día |

Usa `useTurnoMetrics()` internamente — no recibe datos por props.

---

## Tests

`components/TurnoSummaryPanel.dom.spec.tsx`: prueba de integración DOM que verifica el renderizado del panel con datos mockeados.

---

## Dependencias entre módulos

- **Importa de `checkout`:** `getTodayMetrics` (use-case) y `orderDrizzleRepository` (implementación concreta del port).
- **Exporta hacia `settings`:** `TurnoSummaryPanel` — montado en el `SettingsModal`.

---

## Veredicto

Módulo **pequeño, justificado y con responsabilidad clara**. No tiene lógica de negocio propia — es un módulo presentacional puro que reutiliza la infraestructura de checkout.

Consideraciones:

1. **Dependencia directa sobre la implementación concreta.** El hook importa `orderDrizzleRepository` directamente en lugar de recibirlo por inyección. Funciona bien, pero si en algún momento se quiere testear el hook con un repo falso, hay que mockear el módulo entero. Para el scope actual del módulo no es un problema real.

2. **Naming: `turno` es un término de dominio específico** (turno de trabajo / shift). Si el producto evoluciona hacia multi-turno o cierre de caja, este módulo es el punto de partida natural para esa feature.

3. El alias `TurnoMetrics = PosMetrics` es intencional: el módulo `turno` tiene su propia semántica aunque use los mismos datos que `checkout`. Está bien.
