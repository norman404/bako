# Módulo `printer`

Gestión de impresoras de comanda (cocina, barra, otros) para Bako.

## Responsabilidad

- CRUD de impresoras (`printers` table).
- Asignar impresoras a categorías de productos.
- Proveer los hooks/UI para configurar impresoras.

## Estructura

```
domain/
  printer.ts        # tipos Printer, PrinterType, PrinterRole, inputs
  errors.ts         # PrinterDomainError, PrinterNotFoundError, PrinterValidationError
  ports.ts          # PrinterRepository
use-cases/
  list-printers.ts
  create-printer.ts
  update-printer.ts
  archive-printer.ts
persistence/
  printer-drizzle.repository.ts
hooks/
  use-printers.ts
components/admin/
  PrinterSettingsPanel.tsx
manifest.ts
```

## Reglas

- `domain/` no importa nada del proyecto (solo `neverthrow` en `ports.ts`).
- `use-cases/` validan inputs puros antes de delegar al repositorio.
- `persistence/` implementa `PrinterRepository` con Drizzle + SQLite.

## Dependencias

- Depende de `settings/domain/module-manifest.ts` para registrarse en `app/module-registry.ts`.
- Es consumido por `menu` (CategoryCreateInput incluye `printerId`) y por `checkout` (vía `usePrintCommands`).
