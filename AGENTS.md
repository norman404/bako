# Bako — Guía para agentes

**Bako**: POS de escritorio — React 19, TypeScript, Tauri 2, Drizzle ORM + SQLite, Zustand 5, TanStack Query. UI local-first (BD embebida vía `@tauri-apps/plugin-sql`), sin routing, pantalla única.

---

## Arquitectura: Clean Architecture por módulo

Cada módulo en `src/modules/<feature>/` es un slice vertical. Las capas externas dependen de las internas, nunca al revés:

```
domain/ (tipos + ports) ← use-cases ← persistence
                                    ↑
                                   hooks (DI + React Query/Zustand)
                                    ↑
                                 components (solo UI)
```

- `domain/` no importa nada del proyecto salvo `src/lib/` y `neverthrow`.
- `ports.ts` vive en `domain/ports.ts`; solo lo importan `use-cases/`, `persistence/`, `hooks/`.
- `components/` recibe datos y callbacks — cero lógica de negocio.
- Módulos sin persistencia (`order`, `settings`) no necesitan `ports.ts` / `use-cases/` / `persistence/`.

**Señales de violación:** domain importando de hooks/store/persistence · hook con lógica de negocio inline en vez de use-case · tipos de dominio definidos dentro de persistence/ · `ports.ts` fuera de `domain/`.

**Modelo de referencia:** módulo `menu` (ver `src/modules/menu/README.md`) — CRUD completo + modifier groups + performance contract (2 queries SQL totales sin importar N productos, nunca 2N).

**Patrón para un use-case nuevo:** contrato en `domain/ports.ts` → función pura en `use-cases/` → implementación en `persistence/` → hook con DI en `hooks/` → consumo desde `components/` (sin importar Drizzle/neverthrow/SQLite). Ver `src/modules/checkout/` como ejemplo end-to-end completo.

---

## Plugin/Registry de módulos

Un módulo se registra declarando su propio `manifest.ts` (contrato en `src/modules/settings/domain/module-manifest.ts`) y agregándose a `src/app/module-registry.ts`. `settings` **nunca** importa de otros módulos de negocio — itera el registry dinámicamente. Los `settingsPanel` deben ser autosuficientes: obtienen sus datos vía hooks propios, nunca por props.

Feature flags viven en la tabla `feature_flags` (SQLite); defaults en `src/modules/feature-flags/store/feature-flags-store.ts` → `DEFAULT_FLAGS`.

---

## Testing y TDD

- `bun:test` nativo para unit tests (`.spec.ts`) y DOM (`.dom.spec.tsx`).
- Setup global en `bunfig.toml` → `src/test/setup-bun.ts`: happy-dom, jest-dom matchers, ResizeObserver polyfill, `clearMocks` y `cleanup`.
- Runner custom en `scripts/run-tests.ts` porque `bun test` aplana `mock.module()` a nivel global cuando varios specs corren en el mismo proceso; el runner ejecuta cada spec en su propio `bun test <file>` para mantener el aislamiento que daba Vitest.
- Correr: `bun run test` (todos), `bun run test:dom` (solo `.dom.spec.tsx`), `bun run test:node` (solo `.spec.ts`).
- **TDD estricto es mandatorio** (ver `CONTRIBUTING.md`): RED (test del comportamiento nuevo, debe fallar) → GREEN (código mínimo) → REFACTOR (limpiar en verde).
- Al refactorizar UI: no modifiques tests viejos — agregá un `describe` nuevo al final y mantené los mismos `data-testid` / `getByRole` / `getByLabelText`.
- `src/shared/i18n/locale-completeness.spec.ts` es guard permanente: toda key nueva en `es-MX` debe propagarse a los otros 4 locales o el test falla.
- Fixtures de dominio compartidas viven en `src/modules/<módulo>/test/factories.ts`, una por tipo, dueño = módulo que define el tipo (ej. `Product`/`ModifierGroup` en `menu`, `CartItem` en `order`). Patrón único: `(overrides: Partial<T> = {}) => ({...defaults, ...overrides})`. Import por path directo (`@/modules/menu/test/factories`), nunca vía el barrel del módulo. No reimplementar el shape de un tipo de dominio en un spec — importar la factory del módulo dueño.

---

## Tooling: Bun

El proyecto usa **Bun** (>=1.3) como package manager y como runtime de vite/tsc (scripts `dev`/`build`/`preview` con `bunx --bun`). Los tests corren con `bun:test` nativo, orquestados por `scripts/run-tests.ts` para aislar cada spec en su propio proceso.

**Anti-patrón:**
- NO introducir `bunfig.toml` con `[run] bun = true` — forzaría que todo corra con Bun de formas inesperadas. La sección `[test].preload` es la única permitida.

---

## Debugging de bugs en producción

No asumas estado de BD ni del store. Protocolo: reproducir el bug con el usuario → pedir o agregar logs (IDs, valores reales, respuestas de red) → formular hipótesis basada en los logs → recién entonces escribir el fix → verificar con el usuario y con tests de regresión.

**Caso real:** "reordenar grupos no hace nada y parpadea" se resolvió solo cuando los logs mostraron que **todos los grupos tenían `sortOrder: 0`**. El fix fue reasignar `sortOrder` a todos según la nueva posición, no swapear el valor entre dos grupos.

---

## ADRs

Decisiones arquitectónicas difíciles de revertir van en `docs/adr/` (template en `docs/adr/README.md`, archivo `docs/adr/NNNN-titulo-corto.md`). Un ADR `Accepted` no se edita salvo correcciones menores — si la decisión cambia, se crea un ADR nuevo que la supere.

**Vigentes:** [0001 — Precios en centavos enteros](./docs/adr/0001-prices-in-cents.md) · [0002 — Traducir errores de dominio en el boundary de UI](./docs/adr/0002-domain-error-translation.md).

---

## Migraciones de base de datos

Las migraciones SQLite las maneja **exclusivamente Tauri** (`tauri_plugin_sql`, registradas en `src-tauri/src/lib.rs`). No existe ni debe existir un runner de migraciones en TypeScript.

- Una migración aplicada es **inmutable** — modificarla rompe la BD de los usuarios que ya la tienen (Tauri detecta el checksum y falla el arranque).
- Para cambios: archivo `.sql` nuevo con número secuencial + su registro en `lib.rs`. Nunca tocar un `.sql` anterior.

---

## Updater de Tauri — firma y llaves

La `pubkey` en `src-tauri/tauri.conf.json` queda compilada dentro del binario en build-time; rotarla en el repo no actualiza nada retroactivamente en instalaciones existentes.

- `TAURI_SIGNING_PRIVATE_KEY` y la `pubkey` **nunca se rotan** sin coordinar antes un aviso a usuarios.
- Todo cambio de `pubkey` requiere verificación round-trip antes de publicar: firmar con la clave candidata y comparar el `key_id` **real** —bytes `[2:10]` de la estructura minisign decodificada en base64— contra la pubkey candidata, no el texto del comentario del archivo `.pub`. Si no coinciden byte a byte, no se publica.
- **Caso real:** un mismatch entre el comentario del `.pub` y sus bytes reales dejó el auto-update roto (v0.2.2–v0.2.6) sin que ningún build fallara — el error solo aparecía en runtime del usuario final como `The signature was created with a different key than the one provided`.

---

## Módulos y su estado

| Módulo | Estado | Notas |
|---|---|---|
| `menu` | Completo | Modelo de referencia — modifier groups, batch queries, 4 sub-paneles admin |
| `checkout` | Completo | Ejemplo de use-case end-to-end |
| `order` | Domain + store | Sin persistencia; `CartItem.selectedModifiers` viene de `menu` |
| `settings` | Solo UI state | Define el contrato `ModuleManifest` |
| `feature-flags` | Completo | Con optimistic updates |
| `delivery` | Completo | Flag `delivery_enabled` |
| `shift-reports` | Completo | Flag `shift_management_enabled` |
| `updater` | Adapter, sin persistencia | Flag `auto_update_enabled` |

---

## Skills del proyecto

| Skill | Ubicación | Cuándo se activa |
|---|---|---|
| `bako-release` | `.pi/skills/bako-release/SKILL.md` | Pedido de release, build, bump de versión o "cut a release". Gate obligatorio: `bun run lint` + `bun run test` + `bun run test:dom` en verde antes de tocar `package.json`, `tauri.conf.json`, `Cargo.toml`/`Cargo.lock`. |
