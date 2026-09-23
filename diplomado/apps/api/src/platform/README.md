# Platform

Esta carpeta es el límite del núcleo técnico de la API. Alojará autenticación, tenants, companies, users, RBAC, settings, audit, numbering, attachments, notifications, events, jobs y custom-fields.

## Límites

- La plataforma no contiene reglas específicas de ventas, compras, inventario o contabilidad.
- Los módulos de negocio consumen capacidades de plataforma mediante servicios públicos y eventos.
- Los módulos no importan archivos internos de otro módulo ni acceden directamente a sus modelos o repositorios.
- Cada persistencia de negocio debe conservar el aislamiento por `tenantId`, salvo colecciones globales explícitas.

La migración progresiva desde `src/core/` se realizará en tareas posteriores de la Fase 0.5.