# Printer Shared Factories Specification

## Purpose

Proveer fixtures de dominio `Printer` reutilizables para los specs del proyecto, eliminando la duplicación actual donde cada spec reimplementa su propio `buildPrinter`. La factory sigue el patrón único del proyecto: `(overrides: Partial<T> = {}) => ({...defaults, ...overrides})`, dueño = módulo `printer`.

## Requirements

### Requirement: Factory buildPrinter con defaults válidos

La factory `buildPrinter` genera una instancia de `Printer` válida con valores por defecto coherentes con el dominio, sin requerir argumentos.

#### Scenario: buildPrinter genera un Printer válido con defaults

- GIVEN la factory `buildPrinter` importada desde `@/modules/printer/test/factories`
- WHEN se invoca `buildPrinter()` sin argumentos
- THEN retorna un objeto que satisface el tipo `Printer`
- AND todas las propiedades requeridas tienen valores por defecto coherentes (id, name, type, address, role, labelWidthMm, labelHeightMm, labelGapMm, labelLanguage, createdAt, updatedAt, deletedAt)
- AND el `id` es un string no vacío
- AND `deletedAt` es `null`

#### Scenario: buildPrinter permite sobreescribir campos específicos

- GIVEN la factory `buildPrinter`
- WHEN se invoca `buildPrinter({ role: "receipt", isDefault: true, name: "Caja 1" })`
- THEN retorna un `Printer` con `role = "receipt"`, `isDefault = true` y `name = "Caja 1"`
- AND los campos no sobreescritos conservan los valores por defecto

#### Scenario: buildPrinter permite sobreescribir campos anidados libremente

- GIVEN la factory `buildPrinter`
- WHEN se invoca `buildPrinter({ type: "network", address: "192.168.1.50:9100" })`
- THEN retorna un `Printer` con `type = "network"` y `address = "192.168.1.50:9100"`
- AND el resto de campos conservan los valores por defecto

### Requirement: Importación por path directo, no por barrel

La factory debe ser importable por path directo desde otros specs, sin pasar por el barrel del módulo `printer`, siguiendo el patrón de factories compartidas del proyecto.

#### Scenario: Factory importable por path directo desde otros specs

- GIVEN un spec en otro módulo (ej. `checkout`)
- WHEN se importa `import { buildPrinter } from "@/modules/printer/test/factories"`
- THEN la importación resuelve correctamente a la factory
- AND no requiere importar desde el barrel del módulo `printer`

### Requirement: Una sola factory por tipo de dominio

La factory `buildPrinter` es la única dueña de la construcción de fixtures `Printer`, eliminando las implementaciones duplicadas que hoy existen en otros specs.

#### Scenario: Otros specs dejan de duplicar buildPrinter

- GIVEN specs existentes que hoy definen su propia `buildPrinter` local
- WHEN adoptan la factory compartida
- THEN eliminan su implementación local de `buildPrinter`
- Y la factory compartida es la única fuente de construcción de fixtures `Printer`
