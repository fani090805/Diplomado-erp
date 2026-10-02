# Platform

Esta carpeta es el límite del núcleo técnico de la API. Aloja el aislamiento de tenants y alojará autenticación, tenants, companies, users, RBAC, settings, audit, numbering, attachments, notifications, events, jobs y custom-fields.

## Límites

- La plataforma no contiene reglas específicas de ventas, compras, inventario o contabilidad.
- Los módulos de negocio consumen capacidades de plataforma mediante servicios públicos y eventos.
- Los módulos no importan archivos internos de otro módulo ni acceden directamente a sus modelos o repositorios.
- El contexto de cada petición autenticada debe establecerse con `runWithTenantContext` antes de acceder a modelos.
- El plugin global añade el filtro `tenantId` a consultas y agregaciones, y asigna el tenant a documentos nuevos. Solo los esquemas de catálogos compartidos deben declarar `global: true`.
- Los índices de negocio deben empezar por `tenantId`. Los repositorios siguen declarando el filtro de forma explícita para que el alcance sea visible al revisar la lógica.
- No usar `estimatedDocumentCount` ni `bulkWrite` en modelos por tenant. El plugin los rechaza porque esas operaciones no pueden garantizar el aislamiento con el mismo filtro que las consultas normales.
- Las etapas `$lookup`, `$unionWith` y `$graphLookup` en agregaciones reciben el tenant activo. Las etapas de escritura `$merge` y `$out` se rechazan.
- `withTransaction` entrega la sesión a la operación; cada lectura y escritura de una transacción debe pasar esa sesión a Mongoose.

El servidor conecta la base antes de cargar la aplicación para registrar el plugin antes de compilar modelos. El núcleo técnico reside aquí; los módulos de negocio permanecen aislados en `src/modules/`.
