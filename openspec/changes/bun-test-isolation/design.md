# Design: Aislar specs para poder correr `bun test` directo

## Contexto

El proyecto migró de Vitest a `bun:test`. `bun run test` (runner custom) pasa todos los specs, pero `bun test` falla en ~90 tests porque `mock.module()` de Bun no se aísla entre archivos: cuando varios specs corren en el mismo proceso, el mock de un archivo contamina el siguiente. `--isolate` no resuelve el problema (verificado experimentalmente).

El runner custom (`scripts/run-tests.ts`) ejecuta cada spec en su propio proceso. Funciona, pero es un workaround. El objetivo de este change es poder correr `bun test` directo sin contaminación.

## Technical Approach

Eliminar la necesidad de `mock.module()` reemplazándolo por **inyección de dependencias** en los puntos donde el código importa cosas que los tests necesitan controlar.

No se tocarán todos los specs a la vez. Se hará por fases. Los mocks puramente cosméticos (`lucide-react`, `sonner`) **se mantienen locales**: intentar centralizarlos en `setup-bun.ts` falló porque `mock.module()` con un `Proxy` no intercepta los named imports estáticos de Bun (por ejemplo `import { X } from "lucide-react"`). La única alternativa robusta sería un wrapper interno de íconos, lo cual queda fuera del alcance inicial.

## Architecture Decisions

### Decision: preferir inyección por parámetro sobre mock de módulo

**Choice**: cuando un store/hook/adapter importa un módulo externo o propio que hay que stubbear, se expone como argumento/dep con default al implementation real. El test pasa un fake; producción no cambia.
**Alternativas**: seguir usando `mock.module()` (rechazado, no aísla); usar un DI container (rechazado, overkill para este proyecto).
**Rationale**: es el patrón que ya usa el proyecto (ej. `checkForUpdate(deps)` en `tauri-updater.adapter.ts`) y respeta Clean Architecture.

### Decision: mantener mocks cosméticos locales

**Choice**: `lucide-react` y `sonner` siguen mockeándose en cada spec que los necesita. Se ajustan las pocas aserciones que dependen de `data-icon` para no depender del nombre interno del ícono.
**Alternativa**: preload global en `setup-bun.ts` (rechazado — no intercepta named imports en Bun); wrapper interno de íconos (rechazado — cambia demasiados componentes para esta fase).
**Rationale**: el proxy de `mock.module` no funciona para `import { X } from "lucide-react"` en Bun. Mantenerlos locales no causa contaminación de comportamiento porque todos devuelven el mismo stub.

### Decision: no refactorizar adapters de Tauri para que usen constructor

**Choice**: mantener la firma actual `adapter(deps = default)` y que los tests pasen `deps` explícitos.
**Alternativa**: convertir adapters a clases con constructor.
**Rationale**: menor superficie de cambio; el adapter ya acepta deps inyectables.

## Fases de migración

| Fase | Objetivo | Archivos a modificar | mock.module() eliminados (estimado) |
|------|----------|----------------------|------------------------------------|
| 0 | Reorganizar specs: quitar intento de mocks cosméticos globales; mantener lucide/sonner locales | ~18 specs DOM | 0 (aprendizaje) |
| 1 | Piloto updater: adapter deps + store factory | `tauri-updater.adapter.ts`, `updater-store.ts`, 3 specs updater | 3 |
| 2 | Feature flags: repository inyectado en store | `feature-flags-store.ts`, `feature-flag-drizzle.repository.ts`, sus specs/hooks | 4 |
| 3 | DB client inyectada en repositorios | 7 repository specs + repositorios | 7 |
| 4 | Hooks propios inyectados en componentes | `App.dom.spec.tsx`, `SettingsModal.dom.spec.tsx`, panels de shift, etc. | ~10 |

## Piloto 1: módulo `updater`

### Cambios en `tauri-updater.adapter.ts`

Ya expone `deps` en `checkForUpdate` y `relaunchApplication`. Falta hacer lo mismo para `downloadAndInstallUpdate`, que hoy delega directo al `handle`.

### Cambios en `updater-store.ts`

Hoy el store importa `checkForUpdate`, `downloadAndInstallUpdate`, `relaunchApplication` directamente. Se agrega un factory `createUpdaterStore(adapter)` que recibe:

```ts
export interface UpdaterAdapter {
  checkForUpdate: () => Promise<UpdateAvailableInfo | null>;
  downloadAndInstallUpdate: (handle: UpdateHandle, onEvent: ...) => Promise<void>;
  relaunchApplication: () => Promise<void>;
}
```

`useUpdaterStore` sigue siendo la instancia por default creada con el adapter real. Tests usan `createUpdaterStore(testAdapter)`.

### Cambios en specs

- `updater-store.spec.ts`: usa `createUpdaterStore(mockAdapter)` en vez de `mock.module`.
- `use-updater.dom.spec.tsx` y `use-updater.shared.dom.spec.tsx`: renderizan con un store creado a partir del mock adapter (ver "Testing Strategy" abajo).

## Piloto 2: `feature-flags`

### Cambios en `feature-flags-store.ts`

Agregar factory `createFeatureFlagsStore(repository)`.

```ts
export interface FeatureFlagsRepository {
  list: () => ResultAsync<FeatureFlag[], FeatureFlagPersistenceError>;
  update: (key: FeatureFlagKey, value: boolean) => ResultAsync<void, FeatureFlagPersistenceError>;
}
```

`useFeatureFlagsStore` mantiene instancia default con `featureFlagDrizzleRepository`.

### Cambios en specs/hooks

- `feature-flags-store.spec.ts`: usa `createFeatureFlagsStore(mockRepo)`.
- `use-feature-flags.spec.tsx` / `use-update-feature-flag.spec.tsx`: si dependen del store, crear store de test.
- `FeatureFlagsPanel.dom.spec.tsx`: idem.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `updater-store` con adapter fake | `createUpdaterStore(fakeAdapter)`, assert sobre status |
| Unit | `feature-flags-store` con repo fake | `createFeatureFlagsStore(fakeRepo)`, assert flags + persistence |
| Integration | `useUpdater` reacciona a cambios de store | renderHook con un `UpdaterStoreProvider` o pasando store por contexto |
| DOM | componentes con hooks propios | envolver en providers que entreguen stores/repos de test |

Para no cambiar la API pública de los hooks, se puede introducir un **contexto interno** (no exportado al resto de la app) que el hook use para obtener el store. Tests envuelven con un provider que inyecta el store de prueba. Producción usa el provider default que entrega la instancia global.

Ejemplo:

```ts
// updater-store-context.tsx (no exportado salvo hooks)
const UpdaterStoreContext = createContext(useUpdaterStore);

export function useUpdaterStoreInstance() {
  return useContext(UpdaterStoreContext);
}
```

```ts
// use-updater.ts
import { useUpdaterStoreInstance } from "./updater-store-context";

export function useUpdater() {
  const store = useUpdaterStoreInstance();
  // ...
}
```

```ts
// app (producción)
<UpdaterStoreProvider value={useUpdaterStore}>...</UpdaterStoreProvider>
```

```tsx
// test
const testStore = createUpdaterStore(fakeAdapter);
render(
  <UpdaterStoreProvider value={testStore}>
    <Component />
  </UpdaterStoreProvider>
);
```

Esto evita tocar la firma pública de `useUpdater()` y `App.tsx`.

## Open Questions

- [x] ¿El contexto por store es aceptable o preferís pasar el store por props a los hooks? → **Aceptado: contexto interno por store**.
- [ ] ¿Para `App.dom.spec.tsx` — que tiene 10 `mock.module()` — preferís fragmentar el test en varios archivos más chicos o aceptar que sea el último en migrar?
- [x] ¿Incluimos la fase 5 (mocks cosméticos globales) al principio para reducir ruido? → **No: Bun no intercepta named imports con `mock.module` + Proxy**.
- [ ] ¿Se actualiza `openspec/config.yaml` para reflejar `test_runner: bun` al final del change?
