# Tasks: Visual and Currency Upgrade

## Phase 1: Infrastructure and Security Patch (Prioridad Crítica)
- [x] **1.0 Tauri Security Patch**: Agregar el permiso `"sql:allow-select"` en el archivo de capacidades por defecto de Tauri `src-tauri/capabilities/default.json`. Esto permite que las consultas SELECT ejecutadas por Drizzle ORM a través de Tauri-Plugin-SQL no sean bloqueadas por el puente IPC de Tauri.
- [x] **1.1 Radix Primitives**: Instalar la librería primitiva de modales accesibles en el frontend ejecutando la instalación de `@radix-ui/react-dialog` y registrándola en el `package.json`.
- [x] **1.2 Drizzle Schema**: Definir la estructura de la tabla `system_settings` en `src/shared/infrastructure/db/schema.ts` (con columnas: `id` como primary key por defecto 'current', `locale` text con default 'es-MX', `currency` text con default 'MXN', `createdAt` y `updatedAt`).
- [x] **1.3 Standalone Config**: Crear `src/shared/lib/currency-config.ts` que exporta la constante síncrona `DEFAULT_CURRENCY_CONFIG` para prevenir dependencias circulares entre el store de Zustand y la biblioteca de formateo.

---

## Phase 2: Core State & Logic (Manejo de Estado y Helpers)
- [x] **2.1 Zustand Store**: Implementar `useSettingsStore` en `src/features/settings/store/settings-store.ts` con acciones para `initializeSettings()` (que lee de la DB o siembra datos por defecto) y `updateSettings(locale, currency)` que realiza un UPSERT asíncrono en SQLite y actualiza el estado reactivo.
- [x] **2.2 Sincronización en Formateador**: Refactorizar `src/shared/lib/currency.ts` para que `formatPosCurrency` consuma dinámicamente `useSettingsStore.getState()` mediante un mapa de formateadores `Intl.NumberFormat` indexados y cacheados.
- [x] **2.3 Ordenación Dinámica**: Implementar la función `sortStrings` en `src/shared/lib/currency.ts` utilizando la locale activa recuperada del store de Zustand para realizar la ordenación de catálogos mediante `localeCompare` adaptativo.
- [x] **2.4 Refactorización de Dominio**: Modificar `src/features/menu/domain/product-order.ts` y repositorios asociados para que el ordenamiento de categorías y productos llame a `sortStrings` en vez de llamadas hardcodeadas.

---

## Phase 3: Wiring & Bootstrapping (Acoplamiento de Carga)
- [x] **3.1 Bootstrap Bloqueante**: Refactorizar la lógica en `src/main.tsx` envolviendo la inicialización en una función asíncrona que renderiza un splash screen elegante de carga, ejecuta secuencialmente `initDatabase()` y `initializeSettings()`, y finalmente monta la app de React en el DOM eliminando el flickering visual.
- [x] **3.2 Reactive App Rendering**: Asegurar que los componentes y layouts de UI que muestran precios se suscriban reactivamente a los cambios de `useSettingsStore` para forzar re-renders globales inmediatos al actualizar la moneda en el panel.

---

## Phase 4: UI & Visual Refactoring (Estética Midnight Obsidian)
- [x] **4.1 System Settings Panel**: Crear el componente `src/features/settings/components/system-settings-panel.tsx` que proporciona dropdowns interactivos para seleccionar la divisa activa y el locale de región del POS, con botón de guardado conectado a `updateSettings`.
- [x] **4.2 Settings Modal Refactor**: Refactorizar por completo `src/features/settings/components/settings-modal.tsx` eliminando la maquetación manual e implementando primitivas de `Dialog` de Radix con clase `backdrop-blur-md bg-obsidian/75 border border-white/5 shadow-2xl` y transiciones suaves de opacidad y escala de 200ms.
- [x] **4.3 Panel Integration**: Integrar la nueva pestaña "Sistema" en el panel de navegación interno de `SettingsModal` y renderizar dentro de ella el componente `SystemSettingsPanel`.

---

## Phase 5: Testing & Verification (Aseguramiento de Calidad)
- [x] **5.1 Unit Testing (Vitest)**: Modificar y ampliar la suite de pruebas unitarias en `src/shared/lib/currency.spec.ts` para verificar el formateador monetario dinámico y validar que el fallback síncrono del store de Zustand en Vitest funcione al 100% sin inicializar base de datos de Tauri.
- [x] **5.2 Integration & Accessibility (JSDOM)**: Actualizar los tests de DOM en `settings-modal.dom.spec.tsx` para garantizar que la navegación por teclado (focus trap), tecla Escape y cierre del Radix Dialog se ejecuten correctamente de acuerdo con WAI-ARIA.
- [ ] **5.3 End-to-End Verification**: Arrancar el servidor de desarrollo local y verificar manualmente que al cambiar de pesos mexicanos a pesos argentinos la moneda en el carrito, grilla de productos e impresión de tickets cambie de inmediato sin retraso ni recargas forzadas.
