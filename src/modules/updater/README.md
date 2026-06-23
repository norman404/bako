# Updater

Módulo de actualizaciones automáticas para Bako usando el plugin oficial de Tauri.

## Responsabilidad

- Detectar cuando hay una nueva versión disponible.
- Descargar e instalar la actualización en segundo plano.
- Reiniciar la aplicación para aplicar los cambios.
- Exponer UI reactiva (`UpdateToast` y panel de configuración).

## Estructura

```
updater/
  domain/
    update-status.ts       # Estados de actualización + cálculo de progreso
  adapters/
    tauri-updater.adapter.ts  # Wrappers sobre @tauri-apps/plugin-updater
  store/
    updater-store.ts       # Zustand store — única fuente de verdad del status
  hooks/
    use-updater.ts         # Selector fino sobre el store + flags derivados
  components/
    UpdateToast.tsx        # Toast flotante con estados de actualización
    UpdateSettingsPanel.tsx # Panel de Settings (autónomo, sin props)
  manifest.ts              # Registro en MODULE_REGISTRY (settingsPanel + i18n key)
  index.ts                 # Public API
```

## Responsabilidad de cada capa

- **`store/`** es la única fuente de verdad: holds `status` + el handle interno + las acciones (`checkForUpdates`, `downloadAndInstall`, `relaunch`, `reset`). Toda la lógica vive acá.
- **`hooks/use-updater.ts`** es un selector fino: proyecta el `status` del store en la forma `UseUpdaterResult` y deriva los flags booleanos (`isChecking`, `hasUpdate`, etc.). Sin lógica propia.
- Cada consumer (`UpdateToast` en `App.tsx`, `UpdateSettingsPanel` en Settings) llama a `useUpdater()` y lee del **mismo** store → el status siempre está sincronizado entre el toast y el panel.

## Dependencias

- `@tauri-apps/plugin-updater`
- `@tauri-apps/plugin-process`

## Uso

```tsx
import { useUpdater, UpdateToast } from "@/modules/updater";

function App() {
  const updater = useUpdater();
  return <UpdateToast updater={updater} />;
}
```

## Notas

- El store (`useUpdaterStore`) es la única fuente de verdad. No hay estado por-instancia: el toast y el panel comparten el mismo status.
- `UpdateHandle` oculta la clase privada `Update` de Tauri.
- El porcentaje de descarga se calcula redondeando y limitando a 100%.
- Para testear la lógica, mockeá el adapter (`vi.mock` de `tauri-updater.adapter`) y manipulá el store con `useUpdaterStore.setState()` — ver `store/updater-store.spec.ts`.
- El panel de Settings se registra vía `manifest.ts` (patrón registry). `settings` NUNCA importa este módulo — sólo conoce el contrato `ModuleManifest`. El label del tab se resuelve via i18n (`settingsLabelKey: "sections.updater"`), así que se traduce por locale. Sin `flagKey`: el tab debe verse siempre (si `auto_update_enabled` fuera el `flagKey`, desactivarlo escondería el tab y no se podría re-activar).
