# Tasks: Aislar specs para `bun test`

## Phase 0 — Reorganizar specs y aprendizaje sobre mocks cosméticos

- [x] 0.1 Intentar mocks cosméticos globales (`lucide-react`, `sonner`) en `setup-bun.ts`
- [x] 0.2 Verificar que `mock.module` + Proxy no intercepta named imports estáticos de Bun
- [x] 0.3 Decidir mantener mocks cosméticos locales y ajustar aserciones de íconos
- [x] 0.4 Ajustar `ProductGrid.dom.spec.tsx` para no depender de `data-icon="SlidersHorizontal"`
- [x] 0.5 Verificar `bun run test` y `bun run lint` en verde

## Phase 1 — Piloto `updater`

- [ ] 1.1 Agregar `deps` a `downloadAndInstallUpdate` en `tauri-updater.adapter.ts`
- [ ] 1.2 Crear `UpdaterAdapter` interface y `createUpdaterStore(adapter)` factory
- [ ] 1.3 Crear contexto interno `UpdaterStoreContext` para que `useUpdater` lea store del contexto
- [ ] 1.4 Actualizar `updater-store.spec.ts` a TDD: usar factory con fake adapter
- [ ] 1.5 Actualizar `use-updater.dom.spec.tsx` a TDD: renderHook con provider de store
- [ ] 1.6 Actualizar `use-updater.shared.dom.spec.tsx` a TDD: dos consumers compartiendo store
- [ ] 1.7 Verificar que `bun test src/modules/updater/...` pasa sin `mock.module`

## Phase 2 — `feature-flags`

- [ ] 2.1 Crear `FeatureFlagsRepository` interface y `createFeatureFlagsStore(repository)` factory
- [ ] 2.2 Actualizar `feature-flags-store.spec.ts` a TDD
- [ ] 2.3 Actualizar `use-feature-flags.spec.tsx` y `use-update-feature-flag.spec.tsx`
- [ ] 2.4 Actualizar `FeatureFlagsPanel.dom.spec.tsx`

## Phase 3 — Repositorios con DB inyectada

- [ ] 3.1 Refactor `db` inyectado en `feature-flag-drizzle.repository.ts`
- [ ] 3.2 Refactor `db` inyectado en 6 repositorios restantes
- [ ] 3.3 Actualizar sus specs a TDD

## Phase 4 — Hooks/components propios inyectados

- [ ] 4.1 App.dom.spec.tsx — inyectar hooks externos por contexto o props
- [ ] 4.2 SettingsModal.dom.spec.tsx — inyectar sub-panels y stores
- [ ] 4.3 Shift panels — inyectar `use-shift-reports`

## Phase 5 — Validación final

- [ ] 5.1 Correr `bun test` directo y verificar 0 fallos
- [ ] 5.2 Correr `bun run lint` y `bun run build`
- [ ] 5.3 Eliminar `scripts/run-tests.ts` si `bun test` es estable
- [ ] 5.4 Actualizar `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, `openspec/config.yaml`
