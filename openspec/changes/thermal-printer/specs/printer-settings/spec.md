# Spec: Configuración de Impresora Térmica en Settings

## Requisito

Como administrador del POS, quiero configurar la impresora térmica desde el panel de Settings, para que el sistema sepa a qué impresora y por qué medio enviar los tickets.

## Context

Actualmente `system_settings` solo tiene `locale` y `currency`. Se extenderá para soportar `printerType` y `printerAddress`.

## Scenarios

### ESCENARIO 1: Configurar impresora USB

**Given** que estoy en el panel de System Settings
**When** selecciono "USB" como tipo de impresora
**And** ingreso el VID y PID del dispositivo (ej: `0x04b8:0x0e15`)
**And** guardo la configuración
**Then** `system_settings.printer_type` DEBE ser `"usb"`
**And** `system_settings.printer_address` DEBE ser `"0x04b8:0x0e15"`
**And** se muestra un toast de éxito

### ESCENARIO 2: Configurar impresora de red

**Given** que estoy en el panel de System Settings
**When** selecciono "Red" como tipo de impresora
**And** ingreso la IP y puerto (ej: `192.168.1.100:9100`)
**And** guardo la configuración
**Then** `system_settings.printer_type` DEBE ser `"network"`
**And** `system_settings.printer_address` DEBE ser `"192.168.1.100:9100"`
**And** se muestra un toast de éxito

### ESCENARIO 3: Desactivar impresora térmica

**Given** que estoy en el panel de System Settings
**When** selecciono "Ninguna" como tipo de impresora
**And** guardo la configuración
**Then** `system_settings.printer_type` DEBE ser `"none"` o `null`
**And** el sistema NO intentará imprimir tickets físicos

### ESCENARIO 4: Cargar configuración al inicio

**Given** que la app se inicia
**When** `initializeSettings` se ejecuta
**Then** DEBE cargar `printer_type` y `printer_address` desde `system_settings`
**And** DEBE mantener valores default `"none"` / `null` si no existen en la base de datos

## Reglas

- `printerType` DEBE aceptar los valores: `"usb"`, `"network"`, `"none"`.
- `printerAddress` DEBE ser un string de hasta 64 caracteres.
- El panel DEBE mostrar campos condicionales según el tipo seleccionado (solo address para USB y red).
- La validación DEBE ser mínima: para USB el formato sugerido es `VID:PID` en hex; para red `IP:PUERTO`. El backend puede validar más estrictamente.
- La configuración DEBE persistir en la tabla existente `system_settings` (migración `0011_printer_settings.sql`).

## Notas de implementación

- Se agregarán dos columnas a `system_settings`: `printer_type TEXT` y `printer_address TEXT`.
- En TypeScript se extenderá el tipo del store para incluir `printerType: "usb" | "network" | "none"` y `printerAddress: string | null`.
- El panel se agrega a `SystemSettingsPanel.tsx` con un Select para tipo y un Input para dirección.
