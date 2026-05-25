# Specification: Visual and Currency Upgrade

## Purpose
Especificar formalmente el comportamiento esperado para la regionalización dinámica (locale, formato de moneda y ordenamiento) acoplada a la modernización estética de los modales de configuración de Bako utilizando primitivas accesibles de Radix/Shadcn bajo la línea Midnight Obsidian.

---

## Requirements

### Requirement: Dynamic Currency Formatting
La aplicación DEBE formatear de forma síncrona y reactiva todos los precios renderizados en pantalla basándose en el locale y la divisa activa guardados en el store global de Zustand.

#### Scenario: Reactive Locale and Currency Update
- **GIVEN**: Un producto con precio de `10000` centavos ($100.00).
- **WHEN**: El usuario actualiza sus preferencias en el panel de configuración de `es-MX`/`MXN` a `es-AR`/`ARS`.
- **THEN**: La UI DEBE actualizar inmediatamente la representación visual del precio a `"$100,00"` (o formato específico regional de pesos argentinos) de manera instantánea y reactiva sin necesidad de recargar la aplicación.

---

### Requirement: Database Seeding & Fallback
Si la tabla `system_settings` en SQLite local está completamente vacía (por ejemplo, en un arranque en frío inicial), la base de datos DEBE sembrar automáticamente los valores predeterminados de fábrica. El store de Zustand DEBE contar con un fallback seguro que le permita inicializarse de manera síncrona en entornos sin Tauri (como Vitest).

#### Scenario: Seed Empty Database
- **GIVEN**: Una tabla `system_settings` recién creada y vacía en SQLite.
- **WHEN**: Se ejecuta la función de arranque `initDatabase()`.
- **THEN**: El adaptador de base de datos DEBE insertar un registro por defecto con `locale = 'es-MX'` y `currency = 'MXN'`.

#### Scenario: Zustand Store Vitest Fallback
- **GIVEN**: Un entorno de pruebas DOM en Vitest (Node.js/JSDOM) donde los drivers IPC de Tauri no están montados.
- **WHEN**: Se inicializa el store `useSettingsStore`.
- **THEN**: El store DEBE cargarse silenciosa y síncronamente con los valores por defecto (`'es-MX'`, `'MXN'`) sin lanzar excepciones en la consola, asegurando la ejecución exitosa de los tests.

---

### Requirement: Locale-Aware Sorting
El ordenamiento alfabético de los nombres de categorías y productos en los listados del POS DEBE realizarse utilizando de forma dinámica el locale activo configurado en el sistema, asegurando una colación idiomática correcta.

#### Scenario: Dynamic Alphabetical Sorting
- **GIVEN**: Un listado de categorías `["Árbol", "Barco", "Zorra"]` y el locale activo `'es'`.
- **WHEN**: Se aplica la función de ordenamiento alfabético de la UI.
- **THEN**: El orden resultante DEBE ser exactamente `["Árbol", "Barco", "Zorra"]` (respetando la colación española, donde los caracteres con acento se ordenan correctamente en su posición base).

---

### Requirement: Accessibility & Transitions for Radix Dialog
El nuevo modal de configuraciones DEBE cumplir con el estándar internacional de accesibilidad WAI-ARIA (Radix Dialog) que incluye captura de foco (*focus trap*), cierre del modal mediante la tecla `Escape`, y soporte para lectores de pantalla, todo ello montado sobre transiciones fluidas de CSS bajo el look Midnight Obsidian.

#### Scenario: Accessibility Focus and Dismissal
- **GIVEN**: El modal de configuraciones está abierto.
- **WHEN**: El usuario presiona la tecla `Tab` o la tecla `Escape`.
- **THEN**: El foco del teclado DEBE permanecer atrapado exclusivamente dentro de los controles del modal, y al presionar `Escape` el modal DEBE cerrarse de forma segura liberando el foco al disparador principal.

#### Scenario: Midnight Obsidian Glassmorphism Transition
- **GIVEN**: El usuario hace click en el botón de configuración en la interfaz.
- **WHEN**: El modal es montado en el DOM.
- **THEN**: El overlay y el contenedor principal DEBEN realizar una transición suave de opacidad y escala de exactamente `200ms` usando la clase CSS premium `backdrop-blur-md bg-obsidian/75 border border-white/5 shadow-2xl` para dar una sensación de vidrio flotante.

---

## Technical Specifications Summary

### Requirement Matrix
| Domain | Priority | Covered Requirements | Scenarios |
|--------|----------|----------------------|-----------|
| **Database & Seeding** | High | Carga y sembrado de settings en SQLite. | 2 scenarios |
| **Zustand & Core Store** | High | Inicialización síncrona y fallbacks seguros en tests. | 1 scenario |
| **Dynamic Formatting** | High | Formateador síncrono y reactividad de precios en UI. | 1 scenario |
| **Locale Sorting** | Medium | Ordenación dinámica alfabética locale-aware en catálogos. | 1 scenario |
| **UI Components (Radix)** | High | Accesibilidad ARIA, focus trap y transiciones estéticas. | 2 scenarios |

### Test Coverage Targets
- **Happy Paths**: Cubiertos mediante pruebas unitarias en `currency.spec.ts` y tests DOM del modal de configuración.
- **Edge Cases**: Verificados con fallbacks ante fallos de conexión IPC de Tauri en Vitest.
- **Accessbility**: Cierre mediante `Escape` y *focus trap* validados en tests de DOM de React Testing Library.
