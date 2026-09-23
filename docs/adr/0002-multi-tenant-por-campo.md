# ADR 0002: Multi-tenant por campo

## Contexto

El sistema debe servir a varias organizaciones con datos aislados y seguridad por tenant.

## Decisión

Todos los documentos de negocio incluirán el campo tenantId y, cuando aplique, companyId; además, cada consulta y acceso a repositorios filtrará siempre por tenant.

## Consecuencias

- Aislamiento de datos fuerte.
- Reutilización de infraestructura en una sola base de datos.
- Necesidad de validar tenant en cada acceso.
