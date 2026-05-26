# Proposal: integrate-i18n

## Intent

Agregar soporte de internacionalización (i18n) al POS Bako usando i18next y react-i18next, con es-MX como idioma base. Permitir que el operador cambie el idioma desde el panel de Settings (la preferencia `locale` ya existe en el settings-store) y migrar todas las cadenas de UI actualmente hard-coded a recursos de traducción JSON organizados por namespaces de módulo. La migración debe mantener paridad visual exacta en es-MX (render idéntico al anterior) y permitir otros locales como placeholders.

## Scope

### In Scope
- Instalar y configurar i18next + react-i18next.
- Crear infraestructura i18n en `src/shared/i18n/`: inicialización, provider, utilidades de test.
- Crear recursos JSON por namespace y por idioma: `es-MX/{common,app,settings,menu,checkout,order,turno}.json` completos; placeholders vacíos para `es-AR`, `en-US`, `es-ES`, `pt-BR`.
- Integrar i18n con el `settings-store` para que cambiar `locale` actualice el idioma activo en i18next en runtime.
- Migrar TODAS las cadenas de UI del código fuente a claves de traducción (big-bang across all modules).
- Proveer utilitarios para tests: wrapper `renderWithI18n` que inicializa i18next con recursos en memoria.
- Actualizar tests DOM existentes para usar el wrapper o referencias por `data-testid`.

### Out of Scope
- Cambios en backend/DB (la columna `locale` ya existe y persiste).
- Interfaz para gestionar traducciones fuera del selector de idioma existente.
- Soporte RTL más allá de lo que i18next/React ya posibilita.
- Reglas sofisticadas de pluralización o interpolación avanzada más allá de la configuración por defecto de i18next.

## Capabilities

### New Capabilities
- `i18n-core`: inicialización, recursos, types, helpers y wrapper de provider.
- `i18n-settings-integration`: glue entre settings-store e i18next (sync on change + persistence).
- `i18n-string-migration`: proceso y utilitarios para migrar cadenas: key naming convention, tests helpers.

### Modified Capabilities
- None

## Approach

1. **Preparación**: instalar dependencias, crear `src/shared/i18n/` con config, provider, sync helper y test utils.
2. **Integración con settings**: modificar `main.tsx` para inicializar i18n tras `initializeSettings()`; suscribirse a cambios de `locale` en el store para llamar `i18next.changeLanguage()`.
3. **Migración de strings (big-bang)**: reemplazar todos los literales en componentes por `t('module.feature.element')` o `<Trans>`, agregando la key correspondiente en el JSON de es-MX con exactamente el mismo texto.
4. **Tests**: proveer wrapper `renderWithI18n`; actualizar tests DOM que asertan texto hard-coded.
5. **Validación**: `pnpm test` y `pnpm test:dom` pasan; render en es-MX es idéntico al pre-migración.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | Modified | Agrega `i18next`, `react-i18next` |
| `src/shared/i18n/` | New | Config, provider, sync, locales, test utils |
| `src/main.tsx` | Modified | Await `initI18n()` tras settings init |
| `src/app/App.tsx` | Modified | Usa `useTranslation`, keys migradas |
| `src/modules/settings/store/settings-store.ts` | Modified | Suscripción a locale → `changeLanguage` |
| `src/modules/settings/components/` | Modified | Keys migradas |
| `src/modules/menu/components/` | Modified | Keys migradas |
| `src/modules/checkout/components/` | Modified | Keys migradas |
| `src/modules/order/` | Modified | Keys migradas |
| `src/modules/turno/` | Modified | Keys migradas |
| `src/components/ui/` | Modified | Keys migradas (si aplica) |
| `tests/**` | Modified | Wrappers i18n, assertions actualizadas |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|-----------|
| Rotura de tests DOM que assertan texto hard-coded | High | Wrapper `renderWithI18n` con es-MX exacto; usar `data-testid` donde sea posible. |
| Inconsistencia visual entre es-MX antes y después | Medium | Mantener es-MX como fuente canónica: mismo texto exacto en JSON. Correr tests DOM. |
| Missing keys en runtime | Medium | `i18next` fallback a es-MX; log de missing keys en dev. |

## Rollback Plan

- Revertir commits que introducen i18n.
- Restaurar cadenas originales desde git.
- Eliminar archivos `src/shared/i18n/`.
- Desinstalar dependencias.
- Validar: `pnpm test` pasa y UI en es-MX es idéntica al estado previo.

## Success Criteria

- [ ] Suite completa de tests (unit + DOM) pasa en CI.
- [ ] Render en es-MX es idéntico al comportamiento previo (sin regressions visuales).
- [ ] Cambiar el locale desde Settings actualiza TODO el texto de la UI en runtime sin recargar.
- [ ] No hay console errors/warnings relacionados con i18next o keys faltantes.
- [ ] Documentación mínima añadida: convención de keys y cómo agregar traducciones.
