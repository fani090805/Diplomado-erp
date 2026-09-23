# Roadmap del ERP

## Estado actual

- Fase activa: **Fase 0.5 - Saneamiento**
- Rama: `fase-0.5-saneamiento`
- Estado: T1 completada; pendiente de aprobación para T2
- Bloqueo de seguridad: `.env.example` contiene una credencial real de MongoDB y debe sanearse antes de cualquier commit de esa tarea.

## PLAN DE FASES

### Fase 0.5 - Saneamiento

#### T1 - Arquitectura v2 y límites de plataforma

**Estado: completada**

- Agregar la sección `Arquitectura v2` a `AGENTS.md`.
- Crear la base de `apps/api/src/platform/` para el núcleo técnico.
- Definir el contrato público `index.ts` de los módulos y documentar los límites de dependencia.
- Verificar que no se agreguen imports entre módulos fuera de sus entradas públicas.

#### T2 - Normalización de la raíz del repositorio

- Mover el contenido de `diplomado/` a la raíz del repositorio usando `git mv`.
- Eliminar el alias temporal `back/`.
- Versionar `pnpm-lock.yaml`.
- Preservar y revisar los cambios locales existentes sin subir secretos.

#### T3 - CI reproducible

- Crear el workflow de GitHub Actions en la raíz.
- Ejecutar `pnpm/action-setup`, `setup-node` con cache de pnpm e instalación `--frozen-lockfile`.
- Ejecutar lint, typecheck, test, build y `depcheck:arch`.

#### T4 - Autenticación segura

- Hacer que `authenticate.ts` use únicamente `config.jwtSecret`.
- Eliminar valores JWT por defecto y el tenant ficticio `tenant-default`.
- Definir `req.user` con `userId`, `tenantId`, `companyIds` y `permissions`.
- Añadir pruebas para token inválido y token sin tenant.

#### T5 - Contexto de tenant y empresa

- Eliminar la lectura de `X-Tenant-Id`.
- Obtener `tenantId` exclusivamente del token.
- Validar `X-Company-Id` contra `companyIds` del usuario.
- Añadir pruebas de header de tenant falso y compañía ajena.

#### T6 - Permisos de tres niveles

- Adoptar el formato `modulo:recurso:accion` en el catálogo compartido.
- Hacer que `requirePermission.ts` use `hasPermission()` de `@erp/shared`.
- Mantener soporte para el permiso global `*`.
- Cubrir permisos permitidos y denegados con pruebas.

#### T7 - Endpoints y middleware HTTP

- Sustituir el rate limiter basado en `Map` por `express-rate-limit`.
- Agregar handler 404 con el formato estándar de errores.
- Servir Swagger UI en `/docs` sin romper el documento OpenAPI.
- Cambiar el desarrollo del API a `tsx watch` después de verificar la dependencia.

#### T8 - Contratos compartidos y fiscalidad configurable

- Eliminar `calculateIva16` y recibir tasas desde configuración/parámetros.
- Completar `companySchema` con `taxZipCode` y `legalName`.
- Revisar que no queden tasas fiscales fijas en código.
- Dejar cualquier duda fiscal como `TODO(QA)` concreta.

#### T9 - Dependency cruiser y arquitectura verificable

- Agregar y configurar `dependency-cruiser` con reglas para módulos y plataforma.
- Crear el script `depcheck:arch`.
- Hacer que CI ejecute la verificación arquitectónica.
- Documentar excepciones justificadas.

#### T10 - Cierre de saneamiento

- Ejecutar lint, typecheck, test, build y `depcheck:arch`.
- Confirmar las pruebas de seguridad de autenticación, tenant y empresa.
- Actualizar OpenAPI y documentación afectada.
- Dejar la rama lista para revisión, sin merge a `main`.

### Criterio de salida de Fase 0.5

- CI verde en GitHub.
- No hay secretos en archivos versionados.
- Las pruebas de seguridad pasan.
- La arquitectura de plataforma y módulos queda verificable automáticamente.
- La rama queda lista para revisión de QA y cierre explícito de fase.