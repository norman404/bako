# Design: Integración i18n en Bako POS

## Technical Approach

Introducir i18next + react-i18next como capa cross-cutting en `src/shared/i18n/`. El `settings-store` (Zustand) permanece como source-of-truth del locale; i18next es un consumidor reactivo. Los recursos se cargan sincrónicamente desde JSON locales. La migración de strings es un big-bang por módulo, usando namespaces para evitar colisiones y facilitar mantenimiento por feature.

## Architecture Decisions

### Decision: Ubicación del código i18n

**Choice**: `src/shared/i18n/`
**Alternatives considered**: `src/modules/i18n/` (rejected: i18n no es un feature de negocio, es infraestructura cross-cutting)
**Rationale**: Respet Clean Architecture — `domain/` no importa de acá, y múltiples módulos pueden consumirlo sin crear ciclos. Se alinea con `src/shared/db/`.

### Decision: Namespaces por módulo vs monolito

**Choice**: Namespaces separados por módulo: `common`, `app`, `settings`, `menu`, `checkout`, `order`, `turno`
**Alternatives considered**: Un solo JSON por idioma (rejected: no escala, conflictos de keys, difícil mantenimiento por equipo)
**Rationale**: Cada módulo/feature puede mantener su namespace sin tocar los demás. Lazy-loading es posible si crece el bundle.

### Decision: Sincronización store → i18n (unidireccional)

**Choice**: Zustand store como source-of-truth. Suscripción al store dispara `i18n.changeLanguage()`. i18n NO actualiza el store.
**Alternatives considered**: Bidireccional sync (rejected: riesgo de loops, complejidad innecesaria)
**Rationale**: El store ya persiste en SQLite; la UI ya lo usa para currency formatting. Un único source-of-truth evita race conditions. Solo los cambios desde Settings (que mutan el store) deben propagarse a i18next.

### Decision: Inicialización sincrónica sin backend

**Choice**: `i18next.init()` con recursos importados estáticamente (JSON bundlados por Vite)
**Alternatives considered**: i18next-http-backend para cargar JSON dinámicamente (rejected: app desktop/offline-first, no necesita network calls)
**Rationale**: POS local-first, todo debe funcionar offline. Vite puede importar JSON como módulos ES.

### Decision: i18next instances en tests

**Choice**: `i18next.createInstance()` por test + `<I18nextProvider>` wrapper
**Alternatives considered**: Singleton global en tests (rejected: estado compartido entre tests, flaky)
**Rationale**: Tests deterministas y aislados. El helper `renderWithI18n` crea una instancia nueva con recursos en memoria.

## Data Flow

```
Bootstrap (main.tsx)
  ↓
initDatabase()
  ↓
settingsStore.initializeSettings()  --lee locale de SQLite--
  ↓
initI18n({ lng: store.locale })     --carga recursos es-MX + otros--
  ↓
wireI18nWithSettings(i18n)          --suscripción Zustand--
  ↓
ReactDOM.render(<I18nProvider><App/>)

Runtime (Settings UI)
  ↓
Usuario cambia locale en <Select>
  ↓
settingsStore.updateSettings(newLocale, currency)
  ↓
SQLite persiste + Zustand emite cambio
  ↓
subscription detecta nextLocale ≠ i18n.language
  ↓
await i18n.changeLanguage(nextLocale)
  ↓
react-i18next re-renderiza componentes con useTranslation()
  ↓
UI actualiza textos + Intl.NumberFormat usa nuevo locale para currency
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/shared/i18n/index.ts` | Create | Exporta `i18n` singleton, `initI18n()`, `I18nProvider` |
| `src/shared/i18n/config.ts` | Create | Config de i18next (fallbackLng, supportedLngs, interpolation) |
| `src/shared/i18n/resources.ts` | Create | Importa y expone todos los JSON de locales como resource map |
| `src/shared/i18n/sync-with-settings.ts` | Create | Suscribe Zustand store a cambios de locale → `changeLanguage()` |
| `src/shared/i18n/test-utils.tsx` | Create | `createTestI18n()` + `renderWithI18n()` para tests |
| `src/shared/i18n/locales/es-MX/*.json` | Create | 7 namespaces completos |
| `src/shared/i18n/locales/{es-AR,en-US,es-ES,pt-BR}/*.json` | Create | Placeholders vacíos |
| `src/shared/i18n/i18next.d.ts` | Create | Type augmentation para autocompletado de keys |
| `src/main.tsx` | Modify | Await `initI18n()` y `wireI18nWithSettings()` tras settings init |
| `src/app/App.tsx` | Modify | `useTranslation()` en lugar de strings hard-coded |
| `src/modules/settings/store/settings-store.ts` | Modify | Eliminar propósitos duales; store se mantiene como source-of-truth |
| `src/modules/settings/components/SettingsModal.tsx` | Modify | Keys migradas |
| `src/modules/settings/components/SystemSettingsPanel.tsx` | Modify | Keys migradas + toast messages |
| `src/modules/menu/components/*` | Modify | Keys migradas |
| `src/modules/checkout/components/*` | Modify | Keys migradas |
| `src/modules/order/*` | Modify | Keys migradas |
| `src/modules/turno/*` | Modify | Keys migradas |
| `package.json` | Modify | Agrega `i18next` y `react-i18next` |

## Interfaces / Contracts

```typescript
// src/shared/i18n/config.ts
export const i18nConfig = {
  fallbackLng: 'es-MX',
  supportedLngs: ['es-MX', 'es-AR', 'en-US', 'es-ES', 'pt-BR'],
  defaultNS: 'common',
  interpolation: { escapeValue: false }, // React ya escapa
};

// src/shared/i18n/sync-with-settings.ts
export function wireI18nWithSettings(i18n: i18n): () => void;
// Returns unsubscribe function

// src/shared/i18n/test-utils.tsx
export function createTestI18n(
  resources?: Resource,
  lng?: string
): i18n;

export function renderWithI18n(
  ui: React.ReactElement,
  options?: { locale?: string; resources?: Resource }
): RenderResult;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `initI18n()`, `wireI18nWithSettings()`, `createTestI18n()` | Tests puros con instancias aisladas; assertar language y resources |
| Integration | Settings store → i18next sync | Render componente Settings con provider de test; cambiar locale y verificar `i18n.language` |
| DOM | Componentes post-migración | `renderWithI18n` con es-MX; assertar textos visibles no cambiaron vs baseline |
| E2E | Cambio de idioma en runtime | Manual/smoke: cambiar idioma en Settings, verificar UI actualizada |

## Open Questions

- [ ] ¿Necesitamos un script de CI para detectar strings hard-coded restantes? (Fuera de scope inicial, nice-to-have)
- [ ] ¿Cómo manejamos textos en `domain/` que son mensajes técnicos (no UI)? Decisión: no migrar, no son visibles al usuario.

