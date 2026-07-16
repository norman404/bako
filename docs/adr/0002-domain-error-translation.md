# ADR-0002: Traducir errores de dominio en el boundary de UI

## Status

Accepted

## Context

Bako soporta cinco locales (`es-MX`, `es-AR`, `es-ES`, `en-US`, `pt-BR`) y la UI
está casi completamente traducida con `react-i18next`. Sin embargo, varios
mensajes de error llegaban al usuario en inglés incluso cuando la app estaba
configurada en español.

La causa era que la capa de dominio/persistencia generaba errores con mensajes
hardcodeados en inglés (p. ej. `"Product not found: abc"`,
`"Payment method must be cash or card"`) y los componentes mostraban
`error.message` directamente. Como `domain/` no puede depender de `react-i18next`
según las reglas de Clean Architecture del proyecto, nunca se traducían.

## Decision

Vamos a:

1. Hacer que los errores de dominio **traducibles** lleven un `code` literal y
   `params` con los datos a interpolar.
2. Mantener el mensaje en inglés de `Error.message` como texto de diagnóstico
   para logs y desarrollo.
3. Crear un helper `translate{Module}Error(error, t)` en `modules/{feature}/lib/`
   que mapee `error.code` a keys de i18n (`errors:{module}.{code}`).
4. Usar ese helper en los componentes en lugar de mostrar `error.message`.
5. Caídas sin código (errores genéricos de dominio, `Error` nativos, o
   excepciones técnicas) se muestran con un mensaje genérico localizado,
   evitando filtrar stack traces o textos en inglés al usuario final.

## Alternatives considered

- **Traducir en `domain/` o `persistence/`:** rechazado. Acoplaría el dominio a
  `react-i18next`, rompiendo la regla de que `domain/` no importa nada del
  proyecto. También haría los tests de dominio dependientes del setup de i18n.
- **Seguir mostrando `error.message`:** rechazado. Es exactamente el bug que
  estamos arreglando: mensajes en inglés filtrándose a usuarios no angloparlantes.
- **Manejo ad-hoc por componente:** rechazado. Cada panel tendría su propia
  lógica, generando inconsistencias y duplicación.

## Consequences

- (+) La capa de dominio permanece framework-agnostic y testeable en aislamiento.
- (+) Los textos de usuario viven en JSON de locales, siguiendo el flujo normal
  de i18n del proyecto.
- (+) Se reutiliza `locale-completeness.spec.ts` como guard de regresión para
  nuevas keys de error.
- (-) Agregar un nuevo tipo de error requiere tres pasos: código en `domain/`,
  entrada en los 5 locales, y manejo en el helper de traducción.
- (-) Los mensajes genéricos de base de datos (`Failed to list...`) pierden
  detalle en la UI; el detalle sigue disponible en consola/logs.

## Agent guidance

- No traduzcas errores dentro de `domain/` ni `persistence/`. Esas capas deben
  emitir códigos, no textos localizados.
- Si agregás un error translatable nuevo en un módulo, también debés:
  1. Agregar su código al helper `translate{Module}Error`.
  2. Agregar la key y valor en `src/shared/i18n/locales/*/errors.json` bajo la
     sección del módulo.
  3. Extender `src/shared/i18n/locale-completeness.spec.ts` si aún no cubre ese
     namespace.
- No mostrés `error.message` directamente en componentes. Usá el helper del módulo.
- El fallback genérico es intencional: errores técnicos no mapeados deben
  mostrar un mensaje amigable, no el texto crudo de una librería o Tauri.

## Referencias

- Implementación de referencia: `src/modules/menu/domain/errors.ts`,
  `src/modules/menu/lib/translate-menu-error.ts`,
  `src/shared/i18n/locales/es-MX/errors.json`.
- Sección "Error handling pattern" en `CONTRIBUTING.md`.
