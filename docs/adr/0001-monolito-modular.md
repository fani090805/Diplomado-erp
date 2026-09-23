# ADR 0001: Monolito modular

## Contexto

Necesitamos un ERP multi-tenant con módulos desacoplados, pero sin el costo operacional de un conjunto de microservicios.

## Decisión

Se usará un monolito modular con dominios organizados por carpetas, APIs versionadas y comunicaciones por eventos y servicios públicos.

## Consecuencias

- Mayor velocidad de desarrollo.
- Separación clara de responsabilidades por dominio.
- Facilidad para mantener reglas de negocio configurables.
- Requiere disciplina en contratos y aislamiento de módulos.
