# Delta for i18n-settings-integration

## ADDED Requirements

### Requirement: Aplicar locale guardado al iniciar la app

El sistema **MUST** inicializar i18next con el valor de `locale` persistido en el `settings-store` durante el bootstrap.

#### Scenario: Locale no-default al arrancar
- GIVEN `settings-store.locale` es `'pt-BR'` (guardado en SQLite)
- WHEN la app arranca y ejecuta la secuencia de bootstrap
- THEN `i18next.changeLanguage('pt-BR')` **SHALL** ser invocado antes del primer render visible
- AND la UI **SHALL** renderizar textos en `'pt-BR'` o fallback a `'es-MX'` si no hay recursos

### Requirement: Cambio dinámico de locale desde la UI

El sistema **MUST** reaccionar a cambios de `locale` en el `settings-store` y actualizar i18next en runtime.

#### Scenario: Cambio desde Settings
- GIVEN el usuario selecciona un nuevo locale en la pantalla de Settings
- WHEN el `settings-store` actualiza `locale` y persiste en SQLite
- THEN `i18next.changeLanguage(newLocale)` **SHALL** ser llamado
- AND los componentes que usan `useTranslation()` **SHALL** re-renderizar con el nuevo idioma
- AND la app **SHALL NOT** requerir recarga completa

#### Scenario: Prevención de loops de reentrancia
- GIVEN el store y i18next están sincronizados
- WHEN ocurre un cambio de locale
- THEN **SHALL** existir una guarda de reentrancia para evitar que el listener del store dispare `changeLanguage` en loop infinito

### Requirement: Manejo de locales no soportados

El sistema **SHOULD** degradar gracefulmente si el locale seleccionado no tiene recursos.

#### Scenario: Locale sin recursos
- GIVEN `settings-store.locale` se setea a `'xx-YY'` (no definido en recursos)
- WHEN la integración intenta aplicar el locale
- THEN i18next **SHALL** usar fallback a `'es-MX'`
- AND **SHOULD** loggear un warning en consola en modo dev

## MODIFIED Requirements

None

## REMOVED Requirements

None
