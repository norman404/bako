# Bako — Guía para agentes

**Bako**: POS de escritorio — React 19, TypeScript, Tauri 2, Drizzle ORM + SQLite, Zustand 5, TanStack Query. UI local-first, sin routing, pantalla única.

> **Arquitectura:** [`BAKO.md`](BAKO.md) es la fuente de verdad para arquitectura, límites de módulos, SDK, plugins y seguridad. Si este archivo entra en conflicto con `BAKO.md`, prevalece `BAKO.md`.

---

## Cómo trabajar con la arquitectura

- Nuevas features viven en `src/modules/<feature>`.
- Los módulos empiezan planos; agrega subcarpetas solo cuando mejoren la cohesión o navegación.
- No agregues `domain/`, `use-cases/`, `ports.ts`, repositorios o interfaces por defecto. Conserva las capas existentes mientras sigan siendo útiles y simplifícalas incrementalmente cuando el módulo sea modificado.
- `index.ts` es la API pública preferida del módulo para consumidores externos al módulo.
- Lógica de negocio, cálculos y validaciones complejas deben preferir funciones puras.
- React, Zustand, Drizzle, Tauri, impresión, filesystem y red son parte del imperative shell y deben mantenerse cerca de los boundaries.
- No hagas una reescritura masiva solo para cumplir la nueva estructura.
- Plugins externos nunca importan módulos internos; la frontera futura es exclusivamente el Bako SDK.

Lee [`BAKO.md`](BAKO.md) antes de hacer cambios arquitectónicos o relacionados con plugins.

---

## Seguridad

Las invariantes de seguridad para el sistema futuro de plugins están definidas en [`BAKO.md`](BAKO.md). En particular:

- default deny para capacidades externas;
- sin acceso directo de plugins a SQLite/Drizzle;
- sin acceso arbitrario a comandos Tauri;
- permisos explícitos y estrechos;
- validación de operaciones privilegiadas también en Rust;
- secretos de Bako nunca se exponen a JavaScript de plugins;
- mutaciones financieras usan operaciones específicas, no updates genéricos;
- filesystem y red están restringidos por defecto.

No implementes una API de plugins que debilite estas invariantes por conveniencia.

---

## Testing

- `bun:test` nativo para unit tests (`.spec.ts`) y DOM (`.dom.spec.tsx`).
- Setup global en `bunfig.toml` → `src/test/setup-bun.ts`: happy-dom, jest-dom matchers, ResizeObserver polyfill, `clearMocks` y `cleanup`.
- Runner custom en `scripts/run-tests.ts` porque `bun test` aplana `mock.module()` a nivel global cuando varios specs corren en el mismo proceso; el runner ejecuta cada spec en su propio `bun test <file>`.
- Correr: `bun run test` (todos), `bun run test:dom` (solo `.dom.spec.tsx`), `bun run test:node` (solo `.spec.ts`).
- Protege comportamiento e invariantes: reglas de negocio, regresiones, persistencia, permisos, validación de mensajes y boundaries nativos.
- TDD sigue siendo recomendado cuando el comportamiento tiene un contrato claro. No agregues abstracciones únicamente para facilitar mocks.
- `src/shared/i18n/locale-completeness.spec.ts` es guard permanente: toda key nueva en `es-MX` debe propagarse a los otros locales.
- Fixtures compartidas viven con el módulo dueño del tipo cuando aportan valor.

---

## Tooling: Bun

El proyecto usa **Bun** (>=1.3) como package manager y runtime de los scripts de frontend. Los tests corren con `bun:test` nativo, orquestados por `scripts/run-tests.ts`.

**Anti-patrón:** no introducir `bunfig.toml` con `[run] bun = true`; la sección `[test].preload` es la única permitida actualmente.

---

## Debugging de bugs en producción

No asumas estado de BD ni del store. Protocolo: reproducir el bug con el usuario → pedir o agregar logs relevantes → formular hipótesis basada en datos → escribir el fix → verificar con tests de regresión cuando corresponda.

---

## ADRs

Decisiones arquitectónicas difíciles de revertir van en `docs/adr/` (template en `docs/adr/README.md`). Un ADR `Accepted` no se reescribe para cambiar la decisión; crea uno nuevo que lo supere.

**Vigentes:** [0001 — Precios en centavos enteros](./docs/adr/0001-prices-in-cents.md) · [0002 — Traducir errores de dominio en el boundary de UI](./docs/adr/0002-domain-error-translation.md) · [0003 — Renderizado bitmap para impresoras XPrinter](./docs/adr/0003-tspl-bitmap-raster-xprinter.md).

---

## Migraciones de base de datos

Las migraciones SQLite las maneja **exclusivamente Tauri** (`tauri_plugin_sql`, registradas en `src-tauri/src/lib.rs`). No debe existir un segundo runner de migraciones en TypeScript.

- Una migración aplicada es inmutable.
- Para cambios: archivo `.sql` nuevo con número secuencial + registro en `lib.rs`.
- Plugins externos no reciben acceso a las migraciones o al handle SQLite principal.

---

## Updater de Tauri — firma y llaves

La `pubkey` en `src-tauri/tauri.conf.json` queda compilada dentro del binario en build-time; rotarla en el repo no actualiza instalaciones existentes.

- `TAURI_SIGNING_PRIVATE_KEY` y la `pubkey` no se rotan sin coordinar una estrategia de actualización.
- Todo cambio de `pubkey` requiere verificación round-trip antes de publicar.

---

## Skills del proyecto

| Skill | Ubicación | Cuándo se activa |
|---|---|---|
| `bako-release` | `.pi/skills/bako-release/SKILL.md` | Pedido de release, build, bump de versión o "cut a release". Gate obligatorio: `bun run lint` + `bun run test` + `bun run test:dom` en verde antes de tocar versiones. |
