# Proposal: Visual and Currency Upgrade

## Intent
Deshardcodear la moneda (MXN/es-MX) y los locales de ordenamiento en favor de una configuración dinámica y regionalizada persistida en SQLite local, mientras que en la capa de UI se reemplazan las maquetaciones de modales e interactividad manuales por primitivas estandarizadas de Radix/Shadcn bajo la estética premium e inmersiva Midnight Obsidian.

---

## Scope

### In Scope
- **Persistencia**: Creación de la tabla `system_settings` en SQLite mediante Drizzle ORM.
- **Estado Global Síncrono**: Implementación de un store de Zustand (`settings-store.ts`) hidratado de manera asíncrona durante el bootstrap inicial para garantizar lecturas de configuración síncronas instantáneas en componentes de UI, utilidades de formateo y ordenación alfabética.
- **Ajustes de UI**: Integración de una nueva pestaña "Moneda y Región" en el modal de configuraciones para cambiar dinámicamente los formatos regionales.
- **Rediseño Premium**: Reemplazo de overlays y diálogos manuales por `Dialog` de Radix/Shadcn con estética **Midnight Obsidian Glassmorphic** (`backdrop-blur-md bg-obsidian/75 border border-white/5 shadow-2xl` y transiciones animadas de 200ms).

### Out of Scope
- Conversión dinámica de divisas en tiempo real o checkout multi-moneda (el POS sigue operando con una sola moneda activa a la vez).
- Internacionalización completa de las cadenas estáticas de texto de la UI (i18n).

---

## Capabilities

### New Capabilities
- `regional-settings`: Administración de moneda activa, formato numérico/monetario y locale de ordenamiento alfabético regionalizado.

### Modified Capabilities
- `product-sorting`: El ordenamiento alfabético de productos y categorías ahora se calcula utilizando el locale configurado dinámicamente en lugar de locales harcodeados como `'es'` o `'es-AR'`.

---

## Approach

Implementamos una **Arquitectura Híbrida (SQLite + Zustand)** para asegurar rendimiento inmediato de renderizado y evitar race conditions o parpadeos:
1. **SQLite (Persistencia)**: Tabla `system_settings` de fila única con clave fija `id = 'current'`. Durante el arranque de la app, se ejecuta `initDatabase()` y se lee este registro único. Si está vacío, se siembran los valores por defecto (`'es-MX'`, `'MXN'`).
2. **Zustand (Caché Síncrona)**: Los helpers utilitarios como `formatPosCurrency` y los algoritmos de ordenamiento consumen el store a través de `useSettingsStore.getState()` de forma síncrona. Los componentes de React se suscriben mediante hook convencional para forzar re-renders reactivos automáticos e instantáneos ante modificaciones.
3. **Estética Midnight Obsidian**: Los estilos globales y variables CSS de Tailwind v4 (`--obsidian`, `--champagne`) mapean directamente a los tokens de Shadcn. El modal utiliza transiciones de Radix Dialog con desenfoque de fondo premium para emular la experiencia táctil de un sistema operativo moderno de escritorio.

---

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/shared/infrastructure/db/schema.ts` | Modified | Agregar la definición de la tabla `system_settings` en Drizzle. |
| `src-tauri/migrations/0004_system_settings.sql` | New | Script de migración SQLite para crear la tabla de configuraciones. |
| `src-tauri/src/lib.rs` | Modified | Registrar la migración correspondiente (v5) en el builder de Tauri. |
| `src/shared/store/settings-store.ts` | New | Implementar el store Zustand para hidratar las configuraciones globales. |
| `src/shared/lib/currency.ts` | Modified | Refactorizar `formatPosCurrency` para leer de Zustand dinámicamente en lugar de constantes fijas. |
| `src/features/menu/domain/product-order.ts` | Modified | Cambiar el ordenamiento alfabético para usar el locale activo. |
| `src/features/checkout/persistence/order-drizzle.repository.ts` | Modified | Actualizar la ordenación interna de productos para usar el locale del store. |
| `src/main.tsx` | Modified | Establecer el bootstrap bloqueante esperando la inicialización de DB y Store antes de renderizar React. |
| `src/features/settings/components/settings-modal.tsx` | Modified | Refactorizar modales manuales a Radix Dialog e integrar la pestaña de configuración regional. |

---

## Risks and Mitigation

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| **Flickering Visual en el Arranque** | Medium | Se bloquea el renderizado de React en `main.tsx` mediante un splash minimalista hermoso hasta que la lectura asíncrona de SQLite finalice y pueble el store de Zustand. |
| **Rotura de Tests de DOM en Vitest** | High | Entornos de Node.js no tienen acceso a Tauri IPC. Se implementa un fallback estático síncrono (`DEFAULT_CURRENCY_CONFIG`) en el store de Zustand que se activa inmediatamente si Tauri no está montado, asegurando compatibilidad 100% hacia atrás sin romper los tests existentes. |
| **Degradación de Performance por Lecturas en SQLite** | Low | La UI nunca consulta SQLite directamente en hilos críticos. Zustand actúa como caché en memoria de solo lectura ultra-rápida. SQLite solo recibe escrituras asíncronas en segundo plano ante cambios manuales. |

---

## Rollback Plan
En caso de falla crítica, se revertirá el commit de Git y se aplicará una migración inversa en SQLite para eliminar la tabla `system_settings` si es necesario.

---

## Dependencies
- `@radix-ui/react-dialog` (primitiva de Shadcn para modales accesibles)
- `lucide-react` (iconos estilizados de control)

---

## Success Criteria
- [ ] Cambio dinámico de formato monetario e idioma de ordenamiento reactivo al instante en todo el POS al guardar cambios en el panel.
- [ ] Cero flickering visual durante el inicio de la app.
- [ ] Suite completa de tests unitarios y de DOM ejecutándose sin errores en Vitest.
