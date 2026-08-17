# ADR-0002: Traducir errores de dominio en el boundary de UI

## Status

Accepted

> **Nota editorial (2026-08-09).** La decisión de este ADR no cambió: traducir los errores de
> dominio en el boundary de UI sigue vigente tal cual. Lo único que se corrigió fue la
> formulación: antes nombraba carpetas de una arquitectura por capas que el modelo destino
> elimina, así que quedaba prescribiendo una estructura muerta. Ahora se enuncia por
> **rol** — lógica de dominio, acceso a datos, boundary de UI — y las rutas apuntan a la
> convención destino. Es una corrección menor de las que permite el lifecycle en
> [`README.md`](./README.md#reglas-de-lifecycle), no un ADR nuevo.

## Context

Bako soporta DOS locales (`es-MX`, `en-US`) y la UI
está casi completamente traducida con `react-i18next`. Sin embargo, varios
mensajes de error llegaban al usuario en inglés incluso cuando la app estaba
configurada en español.

La causa era que la lógica de dominio y el acceso a datos generaban errores con
mensajes hardcodeados en inglés (p. ej. `"Product not found: abc"`,
`"Payment method must be cash or card"`) y los componentes mostraban
`error.message` directamente. Como esa lógica no depende de `react-i18next` —
no conoce el idioma activo ni el framework de UI — nunca se traducían.

## Decision

Vamos a:

1. Hacer que los errores de dominio **traducibles** lleven un `code` literal y
   `params` con los datos a interpolar.
2. Mantener el mensaje en inglés de `Error.message` como texto de diagnóstico
   para logs y desarrollo.
3. Crear un helper `translate{Module}Error(error, t)` **dentro del módulo dueño
   de esos errores** — `src/modules/{feature}/translate-{feature}-error.ts`
   según la convención destino — que mapee `error.code` a keys de i18n
   (`errors:{module}.{code}`).
4. Usar ese helper en los componentes en lugar de mostrar `error.message`.
5. Caídas sin código (errores genéricos de dominio, `Error` nativos, o
   excepciones técnicas) se muestran con un mensaje genérico localizado,
   evitando filtrar stack traces o textos en inglés al usuario final.

## Alternatives considered

- **Traducir en la lógica de dominio o en el acceso a datos:** rechazado.
  Acoplaría la lógica de negocio a `react-i18next`, rompiendo la regla de que no
  depende del framework de UI ni de sus librerías. También acoplaría la lógica
  de dominio al setup de i18n.
- **Seguir mostrando `error.message`:** rechazado. Es exactamente el bug que
  estamos arreglando: mensajes en inglés filtrándose a usuarios no angloparlantes.
- **Manejo ad-hoc por componente:** rechazado. Cada panel tendría su propia
  lógica, generando inconsistencias y duplicación.

## Consequences

- (+) La capa de dominio permanece framework-agnostic y testeable en aislamiento.
- (+) Los textos de usuario viven en JSON de locales, siguiendo el flujo normal
  de i18n del proyecto.
- (+) Las nuevas keys de error se mantienen en los cinco locales mediante una
  verificación explícita del cambio.
- (-) Agregar un nuevo tipo de error requiere tres pasos: el código en la lógica
  de dominio, la entrada en los 5 locales, y el manejo en el helper de traducción.
- (-) Los mensajes genéricos de base de datos (`Failed to list...`) pierden
  detalle en la UI; el detalle sigue disponible en consola/logs.

## Agent guidance

- La traducción ocurre **en el boundary de UI**, y solo ahí. La lógica de dominio
  y el acceso a datos emiten **códigos** de error, nunca textos localizados: no
  conocen el idioma activo ni deben conocerlo.
- Si agregás un error translatable nuevo en un módulo, también debés:
  1. Agregar su código al helper `translate{Module}Error` del módulo.
  2. Agregar la key y valor en `src/i18n/locales/*/errors.json` bajo la
     sección del módulo.
  3. Verificar que el namespace mantenga la misma estructura en los cinco
     locales.
- No mostrés `error.message` directamente en componentes. Usá el helper del módulo.
- El fallback genérico es intencional: errores técnicos no mapeados deben
  mostrar un mensaje amigable, no el texto crudo de una librería o Tauri.

## Referencias

- Implementación de referencia: los errores tipados del módulo `menu`, su helper
  `src/modules/menu/translate-menu-error.ts`, y
  `src/i18n/locales/es-MX/errors.json`.
- Sección "Error handling pattern" en `CONTRIBUTING.md`.
- [`BAKO.md`](../../BAKO.md#layers-that-do-not-exist-in-this-model) — por qué este
  ADR ya no se enuncia nombrando carpetas.
