# AGENTS.md — Reglas del proyecto ERP

## Tu rol
Eres el desarrollador principal de un sistema ERP genérico para cualquier tipo de empresa (enfocado primero en México). Tu trabajo será revisado por un analista QA. Sigue estas reglas SIEMPRE. Si una instrucción de una tarea contradice este archivo, detente y pregunta.

## Contexto del producto
ERP modular, multi-empresa (multi-tenant) y API-first. Debe resolver los problemas típicos de SAP, Oracle, NetSuite, Microsoft Dynamics y Odoo:
- Personalizaciones que se rompen al actualizar → núcleo cerrado + extensiones aisladas por eventos/hooks.
- Reglas de negocio en código → reglas configurables guardadas en BD (colección `settings`).
- Integraciones difíciles → todo pasa por la API REST versionada `/api/v1`.
- Móvil pobre → una sola app React Native + React Native Web con soporte offline.
- Fiscal mexicano ausente → módulo `fiscal-mx` nativo (CFDI 4.0 vía PAC).

## Arquitectura v2

- `apps/api/src/platform/` contiene el núcleo técnico: autenticación, tenants, companies, users, RBAC, settings, audit, numbering, attachments, notifications, events, jobs y custom-fields.
- `apps/api/src/modules/` contiene únicamente módulos de negocio.
- Cada módulo expone un único `index.ts` público con su servicio y tipos de eventos. Ningún consumidor importa archivos internos de otro módulo.
- El aislamiento de tenant se implementará con `AsyncLocalStorage` y un plugin global de Mongoose. Solo colecciones marcadas `global: true`, como catálogos SAT, quedan exentas.
- El `tenantId` se obtiene exclusivamente del token; nunca del body, query o headers controlados por el cliente.
- Los eventos se persistirán mediante outbox en la misma transacción del documento y serán despachados por Agenda con handlers idempotentes.
- Los documentos de negocio usarán una máquina de estados compartida y permisos por transición.
- Los impuestos se configurarán desde `settings`; las tasas no se escriben fijas en código.
- El timbrado se consumirá mediante `PacProvider`; XML y PDF se almacenarán mediante `StorageProvider`.
- Los permisos siguen el formato de tres niveles `modulo:recurso:accion`.
- Las pruebas transaccionales usarán `MongoMemoryReplSet` y cada módulo nuevo agregará una prueba en `apps/api/test/tenant-isolation/`.

## Stack obligatorio
- Lenguaje: TypeScript en todo (modo `strict: true`). Prohibido `any` salvo justificación en comentario.
- Monorepo: pnpm workspaces + Turborepo.
- Cliente: Expo (React Native + React Native Web), Expo Router, TanStack Query, Zustand, NativeWind, React Hook Form + Zod.
- Backend: Node.js + Express, Mongoose.
- Base de datos: MongoDB Atlas.
- Validación: Zod (esquemas compartidos en `packages/shared`).
- Tareas programadas: Agenda (usa MongoDB, no agregar Redis).
- Dinero: `Decimal128` en MongoDB + `decimal.js` en cálculos.
- Nativo Android: Kotlin mediante Expo Modules API, SOLO cuando JavaScript no alcanza (escáneres industriales, impresoras térmicas, NFC, sincronización en segundo plano).
- Pruebas: Vitest, Supertest, mongodb-memory-server, Playwright (web), Maestro (móvil).
- CI: GitHub Actions.

Usa las versiones estables actuales de cada librería. Antes de usar una librería, verifica que existe en npm y que su API es la que crees. NO inventes paquetes, funciones ni opciones.

## Estructura del monorepo
```
erp/
├── apps/
│   ├── client/        # Expo (RN + RN Web)
│   │   ├── app/       # Rutas Expo Router: (auth)/, (app)/, onboarding/
│   │   ├── src/core/  # auth, permissions, offline, i18n, theme
│   │   ├── src/features/<modulo>/  # components/, hooks/, screens/, api.ts
│   │   ├── src/components/
│   │   └── modules/   # Módulos nativos Kotlin: erp-scanner, erp-printer, erp-sync
│   └── api/           # Express
│       └── src/
│           ├── core/        # config, db, middleware, auth, tenants, companies, users, rbac,
│           │                # settings, audit, numbering, attachments, notifications,
│           │                # events, jobs, errors, logger
│           ├── modules/     # contabilidad, bancos, fiscal-mx, ventas, compras, inventario,
│           │                # crm, rh-nomina, manufactura, proyectos, pos, reportes,
│           │                # importador, integraciones, automatizaciones, ia-asistente
│           ├── integrations/  # pac, tipo-cambio, email, storage
│           ├── extensions/    # sdk/, loader.ts
│           ├── templates/     # plantillas por industria (JSON)
│           ├── app.ts
│           └── server.ts
├── packages/
│   ├── shared/      # schemas/ (Zod), types/, constants/, permissions/, utils/
│   ├── ui/          # sistema de diseño
│   ├── api-client/  # cliente tipado de la API
│   └── config/      # eslint, tsconfig, prettier
├── docs/            # adr/, api/, modulos/, qa/
└── .github/workflows/
```

## Patrón obligatorio de cada módulo del backend
Cada módulo en `apps/api/src/modules/<nombre>/` (y en `core/`) tiene:
| Archivo | Responsabilidad | Regla |
|---|---|---| 
| `<nombre>.routes.ts` | Endpoints + middlewares | Sin lógica de negocio |
| `<nombre>.controller.ts` | Recibe request, llama servicio, responde | Sin acceso directo a BD |
| `<nombre>.service.ts` | Lógica de negocio | Cálculos, reglas, emisión de eventos |
| `<nombre>.repository.ts` | Acceso a MongoDB | SIEMPRE filtra por `tenantId` |
| `<nombre>.model.ts` | Esquema Mongoose + índices | Montos en `Decimal128` |
| `<nombre>.schemas.ts` | Validación Zod de entrada | Reutiliza `packages/shared` |
| `<nombre>.events.ts` | Eventos emitidos/escuchados | |
| `<nombre>.permissions.ts` | Permisos `modulo:recurso:accion` | |
| `__tests__/` | Pruebas | Obligatorias para el servicio |

REGLA DE ORO: un módulo NUNCA importa el modelo o repositorio de otro módulo. Se comunican por el servicio público del otro módulo o por eventos.

## Reglas de base de datos
1. Todo documento de negocio lleva `tenantId` y (cuando aplique) `companyId`.
2. Todo índice compuesto empieza por `tenantId`.
3. Dinero SIEMPRE en `Decimal128`. Nunca `Number` para montos.
4. Operaciones que tocan varios documentos (factura + póliza + kardex) usan transacciones con sesión de MongoDB.
5. Documentos contables y fiscales son inmutables: no se editan, se cancelan con un documento inverso.
6. Catálogos usan borrado lógico (`deletedAt`). Nunca borrar documentos fiscales.
7. Campos personalizados en subdocumento `custom`, validados contra `custom_field_definitions`.
8. Campo `version` para bloqueo optimista en documentos editables.
9. Fechas en UTC en BD.
10. El kardex (`stock_movements`) es inmutable y es la fuente de verdad; `stock_balances` es un saldo calculado.
11. El método de costeo y otras reglas de negocio se leen de `settings`, nunca se escriben fijos en código.

## Seguridad
- JWT de acceso de 15 minutos + refresh token rotativo. En el cliente, tokens en `expo-secure-store` (en web, cookie httpOnly).
- Contraseñas con argon2 (o bcrypt si argon2 da problemas de compilación; documenta la decisión).
- Middleware de tenant: el `tenantId` se toma del token, NUNCA del body o query.
- Middleware de permisos en TODOS los endpoints protegidos.
- Helmet, CORS restringido, rate limiting, validación Zod en toda entrada.
- Toda escritura registra en `audit_logs` (quién, qué, cuándo, antes, después).
- Secretos solo en variables de entorno. Mantén `.env.example` actualizado con valores ficticios. NUNCA escribas credenciales reales ni la URL de Atlas en el código.

## Convenciones de API
- Prefijo `/api/v1`, recursos en plural y kebab-case.
- Acciones de negocio como sub-recurso: `POST /api/v1/invoices/:id/stamp`.
- Paginación: `?page=1&limit=25` → `{ data, meta: { total, page, limit } }`.
- Error estándar: `{ error: { code: "CODIGO_EN_MAYUSCULAS", message, details } }`.
- Header `X-Company-Id` para la empresa activa.
- Header `Idempotency-Key` en creación de facturas y pagos.
- Documentar cada endpoint en OpenAPI (`docs/api/`) y servirlo en `/docs`.

## Estilo de código
- Nombres de código (variables, funciones, archivos, colecciones) en inglés. Nombres de carpetas de módulos de negocio en español como se definieron arriba.
- Textos visibles al usuario en español, a través de i18n.
- ESLint + Prettier sin errores.
- Funciones pequeñas; nada de archivos de más de ~300 líneas sin justificación.
- Componentes del cliente deben funcionar en web Y en móvil. Si usas algo exclusivo de una plataforma, usa archivos `.web.tsx` / `.native.tsx` y documéntalo.

## Prohibido
- Inventar librerías, funciones o parámetros.
- Usar `Number`/`float` para dinero.
- Consultas a BD sin `tenantId`.
- Editar documentos contables o fiscales ya emitidos.
- Importar modelos/repositorios de otro módulo.
- Credenciales en el código.
- Desactivar reglas de ESLint o TypeScript para "hacer que compile".
- Borrar o saltarte pruebas que fallan.
- Avanzar a otra fase sin que te lo pidan.

## Forma de trabajar (obligatoria)
1. PLAN: antes de escribir código, presenta un plan breve de archivos a crear/modificar y espera confirmación si la tarea es grande.
2. IMPLEMENTA en pasos pequeños.
3. VERIFICA después de cada paso: `pnpm lint`, `pnpm typecheck`, `pnpm test`. Si algo falla, corrígelo antes de seguir.
4. Si tienes dudas de negocio (fiscal, contable), NO adivines: deja un `TODO(QA):` con la duda y repórtala.
5. Al terminar, entrega el REPORTE en el formato de abajo.

## Formato de reporte al terminar cada tarea
```
## Reporte de tarea
### Resumen
(qué se hizo en 3-5 líneas)
### Archivos creados / modificados
(lista)
### Comandos ejecutados y resultado
- pnpm lint: OK / errores
- pnpm typecheck: OK / errores
- pnpm test: X pruebas, X pasaron, X fallaron
### Decisiones tomadas
(qué elegiste y por qué, sobre todo si te desviaste de AGENTS.md)
### Pendientes y dudas (TODO(QA))
(lista)
### Cómo probarlo manualmente
(pasos)
```
