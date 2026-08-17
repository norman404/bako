# Design: Soporte de impresoras de etiquetas TSPL

## Technical Approach

Separar protocolo (TSPL) de transporte (USB/TCP). Reutilizar `PrinterDriver` como tubería de bytes crudos: para tipo `"label"` se generan bytes TSPL directamente y se envían por el driver USB o Network existente sin pasar por el builder ESC/POS. El comando Tauri `print_command` recibe el tipo de impresora en el payload y enruta internamente a TSPL o ESC/POS. `print_ticket` y el flujo legacy de recibo quedan intactos.

## Architecture Decisions

| Decision | Choice | Alternatives Rejected | Rationale |
|----------|--------|----------------------|-----------|
| TSPL builder | Nuevo módulo `src-tauri/src/print/tspl/` con builder propio que genera `Vec<u8>` | Reutilizar `escpos::printer::Printer` | ESC/POS genera comandos propios inválidos para TSPL; TSPL requiere instrucciones `SIZE`, `GAP`, `TEXT`, `PRINT`, `CLS`, etc. |
| Transporte | Reusar `PrinterDriver::Usb`/`Network` como pipes de bytes | Crear driver TSPL aparte | `escpos` drivers ya abren endpoints USB/TCP y exponen `write`. Para TSPL solo necesitamos enviar bytes crudos. |
| Enrutamiento | `print_command` recibe `printer_type` y decide protocolo en Rust | Nuevo comando `print_label` | Reduce superficie de comandos; el payload del frontend ya tiene `printerType`. |
| Frontend | Extender `PrinterType` con `"label"` y agregar dimensiones configurables | Tipo separado `LabelPrinter` | Mantiene el modelo unificado de impresoras; las comandas usan la misma lógica de destino. |
| Migración | Columnas nullable `label_width_mm`, `label_height_mm`, `label_gap_mm` en tabla `printers` | Tabla separada | Las dimensiones son propiedades de la impresora; nullable no rompe filas legacy. |
| i18n | Nuevas keys en los 5 locales | Hardcodear textos | El guard `locale-completeness.spec.ts` obliga a mantener paridad. |

## Data Flow

```
PrinterSettingsPanel (tipo label + dimensiones)
        │
        ▼
printerDrizzleRepository ──► printers (SQLite)
        │
        ▼
buildKitchenCommands ──► print-command.adapter
        │
        ▼
invoke("print_command") { printerType: "label", ... }
        │
        ▼
commands::print_command
        │
        ├── type "label"  ──► tspl::build_label_bytes ──► driver.write ──► BEEPRT BY-480BT
        └── type "usb"/"network" ──► build_command ESC/POS
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src-tauri/src/print/tspl/mod.rs` | Create | Builder TSPL: `LabelPayload`, `build_label_command`, test page. |
| `src-tauri/src/print/adapter.rs` | Modify | Agregar `Label` a `create_printer_driver` (mismos drivers); función `print_tspl_command_with_driver`; dispatch por tipo en `print_command_with_driver`. |
| `src-tauri/src/print/error.rs` | Modify | Opcional: renombrar `TicketGeneration` a `Generation` o agregar `LabelGeneration`. |
| `src-tauri/src/print/mod.rs` | Modify | Publicar módulo `tspl`. |
| `src-tauri/src/commands.rs` | Modify | `PrintCommandInput` recibe también campos opcionales de dimensiones; `print_command` los pasa al builder TSPL. No nuevo comando Tauri. |
| `src/modules/printer/domain/printer.ts` | Modify | `PRINTER_TYPE.LABEL = "label"`; `Printer`/`CreateInput`/`UpdateInput` con `labelWidthMm`, `labelHeightMm`, `labelGapMm`. |
| `src/modules/printer/persistence/printer-drizzle.repository.ts` | Modify | Validar `"label"`; mapear dimensiones nullable a defaults (40/30/2). |
| `src/shared/db/schema.ts` | Modify | Agregar `labelWidthMm`, `labelHeightMm`, `labelGapMm` nullable a `printers`. |
| `src-tauri/migrations/0021_label_printer_columns.sql` | Create | `ALTER TABLE printers ADD COLUMN label_width_mm ...`. Registrar migración en `src-tauri/src/lib.rs`. |
| `src/modules/printer/components/admin/PrinterSettingsPanel.tsx` | Modify | Opción `"label"` en selector; inputs de ancho/alto/gap visibles solo para `label`; address helper y placeholder TSPL. |
| `src/modules/printer/adapters/test-printer.adapter.ts` | Modify | Pasar dimensiones si aplica; el backend en `test_printer` decide TSPL vs ESC/POS según `printerType`. |
| `src/modules/checkout/adapters/print-command.adapter.ts` | Modify | Incluir dimensiones de la impresora en el payload de `print_command`. |
| `src/modules/checkout/lib/build-kitchen-commands.ts` | Modify | Pasar `printer.labelWidthMm/HeightMm/GapMm` al destino. |
| `src/modules/checkout/domain/print-command.ts` | Modify | `PrintCommandDestination` incluye dimensiones opcionales. |
| `src/shared/i18n/locales/*` | Modify | Keys `settings:printer.labelWidthMm`, etc., en es-MX, en-US, es-AR, es-ES, pt-BR. |

## Interfaces / Contracts

### Rust — TSPL payload y builder

```rust
// src-tauri/src/print/tspl/mod.rs
#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LabelPayload {
    pub header_text: String,
    pub items: Vec<CommandItem>,
    pub width_mm: Option<u32>,
    pub height_mm: Option<u32>,
    pub gap_mm: Option<u32>,
}

pub fn build_label_bytes(payload: &LabelPayload) -> Result<Vec<u8>, PrintError>;
pub fn build_test_label() -> Vec<u8>;
```

### Rust — routing en adapter

```rust
pub fn print_command_with_driver(
    driver: PrinterDriver,
    printer_type: &str,
    payload: &CommandPayload,
    label_config: Option<LabelConfig>,
) -> Result<(), PrintError> {
    match printer_type {
        "label" => print_tspl_command(driver, payload, label_config.unwrap_or_default()),
        _ => print_escpos_command(driver, payload),
    }
}
```

### TypeScript — domain

```ts
export const PRINTER_TYPE = { USB: "usb", NETWORK: "network", LABEL: "label" } as const;

export interface Printer {
  // ...existing fields
  labelWidthMm: number;
  labelHeightMm: number;
  labelGapMm: number;
}

export interface PrinterCreateInput {
  // ...
  labelWidthMm?: number;
  labelHeightMm?: number;
  labelGapMm?: number;
}
```

### TSPL byte contract (BY-480BT dialect)

```
SIZE {width} mm,{height} mm\r\n
GAP {gap} mm,0 mm\r\n
CLS\r\n
TEXT x,y,"FONT",0,xs,ys,"content"\r\n
PRINT 1,1\r\n
```

Use UTF-8 directo; BY-480BT soporta fuentes internas. No códigos de barras en esta versión.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit (Rust) | `tspl::build_label_bytes` genera secuencia esperada; defaults; modifiers multilinea. | `cargo test` con driver mock. |
| Unit (Rust) | `adapter.rs` dispatch: `"usb"` → ESC/POS, `"label"` → TSPL. | Mock driver contador de bytes. |
| Unit (TS) | `printer-drizzle.repository.ts` acepta `"label"` y aplica defaults. | Repository test con DB en memoria. |
| DOM (TSX) | `PrinterSettingsPanel` muestra inputs de dimensión solo para `"label"`; envía al repo. | `bun run test:dom` con jest-dom. |
| Integration (TS) | `print-command.adapter` incluye dimensiones; `build-kitchen-commands` las pasa. | Spec directo. |
| Manual QA | BEEPRT BY-480BT imprime etiqueta de prueba y comanda real. | Requerido antes de release. |

## Open Questions

- [ ] ¿El BY-480BT requiere `DENSITY` fijo o configurable por impresora? Proposal mencionaba densidad; se deja fuera de MVP hasta validación manual.
- [ ] ¿Se necesita override de endpoint/interface USB para la BEEPRT? Si al probar físicamente falla, se agrega un campo opcional `usb_endpoint` sin tocar el modelo base.

---

## Design Created

**Change**: `label-printer-tspl`  
**Location**: `openspec/changes/label-printer-tspl/design.md`

### Summary
- **Approach**: Separar TSPL de ESC/POS reutilizando drivers como pipes de bytes, con routing en `print_command` y frontend extendido para impresoras `"label"`.
- **Key Decisions**: 6 decisiones documentadas.
- **Files Affected**: ~14 modificados, 2 nuevos (módulo TSPL + migración).

### Open Questions
Dos items pendientes de validación manual con hardware real (densidad y endpoint USB override).

### Next Step
Ready for `sdd-tasks`.
