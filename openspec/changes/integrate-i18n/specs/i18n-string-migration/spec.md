# Delta for i18n-string-migration

## ADDED Requirements

### Requirement: Migración completa de strings hard-coded

El sistema **MUST** migrar TODOS los strings de UI visibles actualmente hard-coded en componentes a keys de traducción.

#### Scenario: Reemplazo funcional de un componente
- GIVEN un componente renderizaba `"Guardar"` en hard-coded
- WHEN se migra a `t('buttons.save')` y se agrega la key en `es-MX.json`
- THEN el render del componente con locale `es-MX` **SHALL** exhibir exactamente `"Guardar"` (misma casing, espacios, puntuación)
- AND **SHALL NOT** quedar strings hard-coded visibles en ese archivo

#### Scenario: Cobertura completa por módulo
- GIVEN un módulo (ej. `menu`) tiene N componentes
- WHEN se completa la migración del módulo
- THEN todos los componentes del módulo **SHALL** usar `useTranslation()` o `<Trans>` para textos visibles
- AND los tests del módulo **SHALL** pasar con `renderWithI18n('es-MX')`

### Requirement: Convención de keys

El sistema **SHALL** usar la convención `namespace:feature:element` para las keys de traducción.

#### Scenario: Key bien formada
- GIVEN el namespace `settings`, feature `system`, element `localeLabel`
- WHEN se usa `t('system:localeLabel')`
- THEN la convención **SHALL** ser consistente en todo el codebase

### Requirement: Keys faltantes en runtime

El sistema **SHOULD** detectar y reportar keys faltantes en tiempo de desarrollo/test.

#### Scenario: Missing key en test
- GIVEN un componente usa `t('missing.key')` pero la key no existe en resources
- WHEN se ejecuta el test
- THEN el test **SHOULD** fallar o loggear un error claro
- AND en producción **SHALL** hacer fallback al texto de la key o a es-MX

### Requirement: Parity visual post-migración

El sistema **MUST** garantizar que la UI en es-MX sea visualmente idéntica pre y post migración.

#### Scenario: Snapshot comparison
- GIVEN existen snapshots o tests DOM pre-migración
- WHEN se ejecutan tests post-migración con `es-MX`
- THEN los snapshots **SHALL** coincidir con los anteriores (salvo cambios intencionales documentados)

## MODIFIED Requirements

None

## REMOVED Requirements

None
