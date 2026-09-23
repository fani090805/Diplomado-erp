# Documentación API

Esta carpeta contiene la especificación OpenAPI del ERP y la referencia de endpoints publicados por la API REST versionada.

## Endpoints base

- `GET /api/v1/health` — health check del backend
- `GET /docs` — documento OpenAPI servido por la API

## Archivo principal

- `openapi.yaml` — esquema OpenAPI 3.1.0 del sistema

## Convenciones

- Prefijo: `/api/v1`
- Recursos en plural y kebab-case
- Respuestas de error con formato estándar:
  ```json
  {
    "error": {
      "code": "INTERNAL_SERVER_ERROR",
      "message": "Ocurrió un error inesperado.",
      "details": null
    }
  }
  ```
