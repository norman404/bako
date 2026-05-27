# Módulo: feature-flags

## Responsabilidad

Gestiona los feature flags de la aplicación: leer su estado desde la base de datos, actualizarlos con optimistic update, y exponerlos al resto de la app via un Zustand store global.

**Vale la pena tenerlo:** Si. Es un mecanismo explícito para activar/desactivar funcionalidades sin deployar. Actualmente controla `categories_enabled` y `multiple_menus_enabled` — que impactan directamente en qué ve el usuario en el POS y en Settings.

---

## Estructura

```
feature-flags/
  domain/
    feature-flag.ts   ← tipos FeatureFlagKey y FeatureFlag
    errors.ts         ← FeatureFlagDomainError, FeatureFlagPersistenceError
    ports.ts          ← interfaz FeatureFlagRepository
  use-cases/
    list-feature-flags.ts
    update-feature-flag.ts
  persistence/
    feature-flag-drizzle.repository.ts
  hooks/
    use-feature-flags.ts
    use-update-feature-flag.ts
  store/
    feature-flags-store.ts
  index.ts
```

---

## Dominio

### Tipos (`domain/feature-flag.ts`)

```ts
type FeatureFlagKey = "categories_enabled" | "multiple_menus_enabled"

interface FeatureFlag {
  key: FeatureFlagKey
  value: boolean
  updatedAt: Date
}
```

### Port (`domain/ports.ts`)

```ts
interface FeatureFlagRepository {
  list(): ResultAsync<FeatureFlag[], FeatureFlagPersistenceError>
  update(key: FeatureFlagKey, value: boolean): ResultAsync<FeatureFlag, FeatureFlagPersistenceError>
}
```

---

## Use-cases

```ts
listFeatureFlags(repository: FeatureFlagRepository)
updateFeatureFlag(repository: FeatureFlagRepository, key: FeatureFlagKey, value: boolean)
```

Wrappers puros — reciben el repo por parámetro, delegan y retornan `ResultAsync`.

---

## Persistence

`feature-flag-drizzle.repository.ts` implementa `FeatureFlagRepository`:
- `list()`: lee todas las filas de `schema.featureFlags`, mapea a domain.
- `update(key, value)`: actualiza el flag y retorna el registro actualizado.

---

## Hooks

### `useFeatureFlags()`
React Query `useQuery`. Llama `listFeatureFlags + repo`. Retorna la lista completa de flags.

### `useUpdateFeatureFlag()`
`useMutation`. Flujo:
1. **Optimistic update** en el Zustand store (UI responde inmediatamente).
2. Llama `updateFeatureFlag(repo, key, value)`.
3. Si falla → rollback en el store.
4. Invalida la query key para re-fetch.

---

## Store (`store/feature-flags-store.ts`)

Zustand store `useFeatureFlagsStore`:

| Estado | Descripción |
|--------|-------------|
| `flags` | Map de `FeatureFlagKey → boolean` |

| Acción | Descripción |
|--------|-------------|
| `initializeFeatureFlags()` | Lee flags desde DB (vía repo); fallback a defaults si no está en Tauri |
| `setFlag(key, value)` | Actualiza el store + persiste via repo |

**El store es la fuente de verdad en runtime.** Los componentes leen `flags` directamente sin pasar por React Query.

---

## Tests

| Archivo | Qué cubre |
|---------|-----------|
| `use-cases/list-feature-flags.spec.ts` | Delegación al repo |
| `use-cases/update-feature-flag.spec.ts` | Delegación al repo |
| `persistence/feature-flag-drizzle.repository.spec.ts` | Lectura y escritura en DB |
| `hooks/use-feature-flags.spec.tsx` | Query binding |
| `hooks/use-update-feature-flag.spec.tsx` | Optimistic update + rollback |
| `store/feature-flags-store.spec.ts` | Inicialización y setFlag |

---

## Dependencias entre módulos

- **`settings`** importa `useFeatureFlagsStore` y `useUpdateFeatureFlag` para el panel de configuración de flags.
- **`menu`** / **`pos`** leen del store para mostrar/ocultar categorías y selector de menú.

---

## Flags actuales

| Key | Efecto cuando está activo |
|-----|--------------------------|
| `categories_enabled` | Muestra la navegación de categorías en el POS |
| `multiple_menus_enabled` | Muestra el selector de menú en el POS y el panel de gestión de menús en Settings |

---

## Veredicto

Módulo **completo y justificado**. Tiene todas las capas + tests. El patrón de optimistic update via Zustand + rollback está bien implementado.

A considerar: el store usa `initializeFeatureFlags()` que escribe directo en la DB (sin pasar por use-cases). Es un shortcut funcional pero rompe levemente la separación; si los flags crecen, conviene usar los use-cases desde el store en lugar de llamar al repo directo.
