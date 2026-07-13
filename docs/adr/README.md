# Architecture Decision Records (ADRs)

Este directorio guarda decisiones técnicas importantes de Bako. La idea es que cualquier agente o desarrollador pueda entender **por qué** el sistema funciona como funciona, no solo **qué** hace el código.

Ver también: sección [Decisiones técnicas](../../AGENTS.md#decisiones-técnicas) en `AGENTS.md`.

## ADRs vigentes

| ADR | Título | Estado |
| --- | --- | --- |
| 0001 | [Precios en centavos enteros](./0001-prices-in-cents.md) | Accepted |

## Convenciones de formato

Cada ADR es un archivo Markdown con el formato Nygard, extendido con una sección de **Agent guidance** para la era de agentes de código.

```markdown
# ADR-NNNN: Título como decisión

## Status
Proposed | Accepted | Deprecated | Superseded by ADR-NNNN

## Context
Fuerzas en juego. ¿Por qué surge esta decisión?

## Decision
Vamos a usar X para Y. Voz activa, 1-2 oraciones.

## Alternatives considered
- Opción A: por qué se rechazó.
- Opción B: por qué se rechazó.

## Consequences
- (+) Ventaja.
- (-) Costo o trade-off.
- (~) Neutral.

## Agent guidance
- Qué NO cambiar sin una nueva ADR.
- Qué tests/runbooks hay que mantener.
- Dónde vive el código afectado.
```

## Reglas de lifecycle

- `Proposed`: en revisión.
- `Accepted`: vigente. **No se edita** salvo correcciones menores de links o typos.
- `Deprecated`: ya no aplica, sin reemplazo.
- `Superseded by ADR-NNNN`: reemplazada por un ADR nuevo. El ADR viejo se mantiene por historia y apunta al nuevo.

Si una decisión `Accepted` necesita cambiar, se crea un ADR nuevo que la supere y se actualiza el status del viejo. Nunca se reescribe la historia.
