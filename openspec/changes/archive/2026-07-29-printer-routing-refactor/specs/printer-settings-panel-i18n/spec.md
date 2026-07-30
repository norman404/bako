# Printer Settings Panel I18n Specification

## Purpose

Migrar los labels, placeholders y estados del `PrinterSettingsPanel.tsx` (hoy hardcoded en español) a keys i18n, propagando cada key nueva a los 5 locales soportados (es-MX, en-US, es-AR, es-ES, pt-BR) según exige el guard `locale-completeness.spec.ts`. Esta capability MODIFICA la existente sustituyendo strings hardcoded por keys.

## Requirements

### Requirement: Labels del panel consumen keys i18n

Todos los textos visibles del `PrinterSettingsPanel` (títulos, labels de campos, botones, placeholders, estados vacíos, mensajes de confirmación) se obtienen vía la función de traducción i18n, sin strings literales hardcoded en español.

#### Scenario: Todos los labels del panel usan keys i18n

- GIVEN el componente `PrinterSettingsPanel.tsx` renderizado
- WHEN se inspecciona su código fuente
- THEN no existen strings literales en español para textos visibles
- AND cada texto visible se obtiene mediante la función de traducción i18n con una key de `settings.json`

#### Scenario: Las keys existen en los 5 locales

- GIVEN las keys i18n nuevas introducidas para el panel
- WHEN se ejecuta el guard `locale-completeness.spec.ts`
- THEN el test pasa porque las keys existen en `es-MX`, `en-US`, `es-AR`, `es-ES` y `pt-BR`
- Y cada locale tiene un valor traducido coherente para cada key

#### Scenario: Placeholders y estados vacíos también i18n-izados

- GIVEN el `PrinterSettingsPanel` mostrando un estado vacío (sin impresoras) o un placeholder de input
- WHEN se renderiza en cualquier locale
- THEN el texto del estado vacío y los placeholders provienen de keys i18n
- Y no hay strings hardcoded en ningún locale

### Requirement: Toggle Predeterminada i18n-izado y condicional por rol

El toggle "Predeterminada" expuesto por el panel (ver capability `printer-management`) usa una key i18n y solo se muestra para impresoras con `role = "receipt"`.

#### Scenario: Toggle Predeterminada visible solo para role = receipt

- GIVEN una impresora `P` con `role = "receipt"` cargada en el panel
- THEN el panel muestra el toggle "Predeterminada" para `P`
- BUT dada una impresora `Q` con `role = "kitchen"` cargada en el panel
- THEN el panel NO muestra el toggle "Predeterminada" para `Q`

#### Scenario: El label del toggle Predeterminada usa key i18n

- GIVEN el toggle "Predeterminada" renderizado en el panel
- WHEN se inspecciona su label
- THEN el texto proviene de una key i18n (ej. `settings.printer.default`)
- Y no es un string literal hardcoded
- Y la key existe en los 5 locales con su traducción correspondiente

### Requirement: Errores de impresora i18n-izados

Los mensajes de error relacionados con impresoras (ej. validación, fallos de impresión) que se muestren desde el panel usan keys i18n, en `settings.json` o `errors.json` según corresponda.

#### Scenario: Mensajes de error de impresora usan keys i18n

- GIVEN un error de validación o de impresión mostrado desde el panel
- WHEN se renderiza el mensaje en cualquier locale
- THEN el texto proviene de una key i18n
- Y no es un string literal hardcoded
- Y la key existe en los 5 locales
