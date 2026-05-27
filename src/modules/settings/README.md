# Módulo: settings

## Responsabilidad

Provee el modal de configuración del sistema: gestión de ajustes generales (locale, moneda), control de feature flags, y acceso a los paneles de administración del catálogo (productos, categorías, menús). Es un módulo de composición de UI — orquesta paneles de otros módulos.

**Vale la pena tenerlo:** Si. Centralizar la configuración en un único modal es correcto. El módulo tiene sentido como punto de entrada a todas las opciones de administración.

---

## Estructura

```
settings/
  components/
    SettingsModal.tsx         ← modal principal con sidebar
    SystemSettingsPanel.tsx   ← panel de locale y moneda
    FeatureFlagsPanel.tsx     ← panel de toggles de feature flags
  store/
    settings-store.ts         ← Zustand store para system settings
  index.ts                    ← export { SettingsModal }
```

---

## Store (`store/settings-store.ts`)

Zustand store `useSettingsStore`:

| Estado | Descripción |
|--------|-------------|
| `locale` | Locale activo (ej: `"es-AR"`) |
| `currency` | Configuración de moneda activa |
| `isLoading` | Flag de carga durante inicialización |

| Acción | Descripción |
|--------|-------------|
| `initializeSettings()` | Lee (o crea) el registro de settings en `systemSettings` table vía shared DB |
| `updateSettings(locale, currency)` | Persiste los cambios en DB con `onConflictDoUpdate` |

**Nota:** La persistencia está implementada directamente en el store usando el cliente Drizzle de `shared/db`, sin pasar por ports/use-cases. Es un shortcut pragmático que funciona, pero si los settings crecen conviene extraer la lógica a capas separadas.

---

## Componentes

### `SettingsModal`

Modal con sidebar de navegación. Secciones:

| Sección | Condición de visibilidad |
|---------|--------------------------|
| Productos | siempre |
| Categorías | `categories_enabled` flag activo |
| Menús | `multiple_menus_enabled` flag activo |
| Turno | siempre |
| Sistema | siempre |
| Feature Flags | siempre (panel de configuración de los propios flags) |

Importa y compone directamente:
- `ProductSettingsPanel`, `CategorySettingsPanel`, `MenuSettingsPanel` de `menu/components/admin`
- `TurnoSummaryPanel` de `turno`
- `SystemSettingsPanel` y `FeatureFlagsPanel` propios

### `SystemSettingsPanel`

Formulario para cambiar locale y moneda. Lee desde `useSettingsStore`, guarda via `updateSettings()`.

### `FeatureFlagsPanel`

Lista de toggles para activar/desactivar feature flags. Usa `useFeatureFlagsStore` para leer el estado actual y `useUpdateFeatureFlag` para persistir cambios con optimistic update.

---

## Tests

| Archivo | Qué cubre |
|---------|-----------|
| `components/SettingsModal.dom.spec.tsx` | Renderizado del modal, navegación entre secciones |
| `components/FeatureFlagsPanel.dom.spec.tsx` | Toggle de flags, estados de loading |

---

## Dependencias entre módulos

Este módulo **importa de**:
- `menu/components/admin` — paneles de gestión del catálogo
- `turno` — panel de resumen de turno
- `feature-flags` — store y hook de actualización

Este módulo **no es importado por** otros módulos — es una hoja en el árbol de dependencias.

---

## Veredicto

Módulo **justificado como orquestador de UI**. Está correctamente diseñado como una capa de composición que no duplica lógica — cada panel que monta viene de su módulo de origen.

Lo que falta o puede mejorar:
1. **No hay tests del store.** `settings-store.ts` no tiene archivo `.spec.ts`. La lógica de inicialización y persistencia merecen cobertura.
2. **Persistencia en el store directo.** Si settings crece (más campos, validaciones), conviene mover la lógica de DB a ports/use-cases.
3. El módulo no tiene `domain/` ni `ports.ts` — correcto para su responsabilidad actual, pero a documentar como decisión consciente.
