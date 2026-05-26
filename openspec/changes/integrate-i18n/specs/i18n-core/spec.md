# Delta for i18n-core

## ADDED Requirements

### Requirement: Inicialización síncrona/estable de i18next

El sistema **MUST** inicializar i18next antes del primer render de React, usando recursos JSON locales sincrónicamente (sin llamadas de red).

#### Scenario: Inicialización por defecto con es-MX
- GIVEN la app arranca sin configuración de locale previa
- WHEN se carga el módulo `initI18n()` antes de renderizar React
- THEN `i18next.language` **SHALL** ser `'es-MX'`
- AND `i18next.options.fallbackLng` **SHALL** incluir `'es-MX'`
- AND los recursos JSON de `es-MX` **SHALL** estar registrados en i18next
- AND no **SHALL** haber excepciones en consola

#### Scenario: Provider expone react-i18next correctamente
- GIVEN un componente `<App/>` que consume `useTranslation()`
- WHEN se renderiza `<I18nProvider><App/></I18nProvider>`
- THEN `useTranslation()` **SHALL** devolver la función `t` y el estado de readiness correctamente
- AND los componentes **SHALL** renderizar strings traducidos desde `es-MX` por defecto

### Requirement: Recursos JSON desde archivos locales

El sistema **MUST** cargar recursos de traducción desde archivos JSON en `src/shared/i18n/locales/{lang}/{namespace}.json`.

#### Scenario: Recursos registrados por idioma y namespace
- GIVEN el directorio `src/shared/i18n/locales/` contiene al menos `es-MX/` y otros locales
- WHEN `initI18n()` registra los recursos
- THEN `i18next.hasResourceBundle('es-MX', 'common')` **SHALL** ser `true`
- AND si falta un archivo de un locale conocido, la inicialización **SHALL NOT** fallar: usa fallback a `es-MX`

### Requirement: Type safety para keys de traducción

El sistema **SHOULD** proveer tipado TypeScript para las keys de traducción, de modo que `t('some.key')` produzca error de compilación si la key no existe.

#### Scenario: Autocompletado de keys válidas
- GIVEN un developer usa `t()` en un componente
- WHEN escribe una key inexistente
- THEN TypeScript **SHOULD** reportar un error en tiempo de compilación

### Requirement: Utilidades de test para i18n

El sistema **MUST** proveer un helper `renderWithI18n()` para tests que inicialice una instancia aislada de i18next con recursos en memoria.

#### Scenario: Render de test con locale por defecto
- GIVEN un test unitario de DOM que renderiza un componente aislado
- WHEN usa `renderWithI18n(<Component />)`
- THEN por defecto **SHALL** usar `es-MX`
- AND **SHALL** permitir override de locale y recursos
- AND **SHALL** restaurar el idioma al finalizar para evitar efectos colaterales entre tests

## MODIFIED Requirements

None

## REMOVED Requirements

None
