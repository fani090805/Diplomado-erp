# AGENTS.md — Reglas del proyecto FAI Solution ERP

Guía para cualquier persona o agente que trabaje en este repositorio. Describe el
proyecto **tal como es hoy**. Si una tarea contradice este archivo, detente y pregunta.

## Qué es
ERP multiempresa (enfocado en México) con API REST, aplicación web y app Android.
Cada empresa ve solo sus datos; una "plataforma" (super admin) aprueba altas de empresas.

## Estructura del repositorio
```
backend/    API REST — Node.js + Express + Mongoose, JavaScript (CommonJS), pruebas con Jest
frontend/   App web — Expo SDK 51 + React Native Web, JavaScript
android/    App nativa — Kotlin + Jetpack Compose, tema FaiTheme
database/   Scripts de índices (database/indexes/apply-indexes.js)
docs/       Arquitectura, decisiones (ADR), API, base de datos, design system y QA
```

### backend/
- `src/app.js` monta las rutas bajo `/api/v1`; `src/server.js` arranca y (si `SEED_ON_START` no es `false`) ejecuta la semilla.
- `src/config/` — `env.js` (variables obligatorias, falla rápido), `permissions.js` (permisos y `DEFAULT_ROLES`), `logger.js`, `database.js`.
- `src/middlewares/` — `authenticate`, `authorize` (`authorize(...)`, `requireTenant`, `platformOnly`), `tenant`, `validate` (Zod), `audit.middleware`, `rateLimit`, `error.middleware`.
- `src/common/` — `BaseRepository` (exige `companyId`), `sequence` (folios SO-, PO-, INC-, EXP-…), errores.
- `src/modules/<modulo>/` — un módulo por carpeta con este patrón:

| Archivo | Responsabilidad |
|---|---|
| `*.routes.js` | Endpoints y middlewares (`authenticate`, `requireTenant`, `authorize`, `validate`). Sin lógica de negocio. |
| `*.controller.js` | Lee la petición, llama al servicio y responde. Sin acceso a BD. |
| `*.service.js` | Reglas de negocio, cálculos y compensaciones. |
| `*.repository.js` | Acceso a MongoDB; siempre filtra por `companyId`. |
| `*.model.js` | Esquema Mongoose e índices (compuestos empiezan por `companyId`). |
| `*.validation.js` | Esquemas Zod de entrada (`.strict()`). |

- Un módulo usa el **servicio** de otro (p. ej. `sales-orders` → `incomes`, `inventory`), no sus rutas.
- `src/scripts/` — semilla y generadores de datos demo (ver "Comandos útiles").
- `tests/` — `unit/` e `integration/` con Jest + Supertest; BD efímera con mongodb-memory-server.

### frontend/
- `src/api/client.js` — cliente HTTP (token, renovación, `api`, `apiText`, `apiBlob`). URL base: `EXPO_PUBLIC_API_URL`.
- `src/auth/` — sesión (`useAuth()` expone `can(permiso)`).
- `src/design-system/` — **design system propio**: `tokens/` (colores, tipografía, espaciado, radios, sombras) y componentes `TT*` (`TTButton`, `TTInput`, `TTSelect`, `TTModal`, `TTTable`, `TTCard`, `TTBadge`, `TTIcon`…).
- `src/components/`, `src/screens/<area>/`, `src/hooks/`, `src/lib/` (formato, rangos de fecha), `src/nav/`.
- Íconos: **Lucide** (`lucide-react-native`) a través de `TTIcon name="..."`; nunca se importan íconos sueltos en pantallas.
- Todo debe funcionar en web y en móvil; lo exclusivo de web se protege con `Platform.OS === 'web'`.

### android/
- Kotlin + Jetpack Compose; tema en `app/src/main/java/com/diplomado/erp/ui/theme/` (`FaiTheme`, `Color.kt`, `Type.kt`, `Shape.kt`).
- Consume la misma API REST del backend. Los DTO (Gson) viven en `core/network/dto/`.
- Por defecto el build debug usa la API de Render. Para un backend local: `.\gradlew.bat assembleDebug -PapiBaseUrl=http://10.0.2.2:4000/api/v1/` (sólo debug permite HTTP a `10.0.2.2`/`localhost`).
- Mensajes de error: siempre con `response.errorMessage(...)` / `serverError()` (`core/network/ServerError.kt`); en Retrofit `body()` es null cuando la respuesta no es 2xx.
- Errores: `friendlyError()` (`core/common/ErrorMessages.kt`) separa los de red (sin conexión, timeout) de los de lectura de datos (DTO distinto a la respuesta), que se registran con `Log.e("FAI-API", …)`.

## Paridad API ↔ Android (contratos)
La app Android lee la API con DTO propios; si la API cambia y el DTO no, Gson falla y la pantalla muestra un error. Para que no vuelva a pasar hay **pruebas de contrato** en los dos lados:

- **Backend:** `backend/tests/contracts/api-contracts.test.js` llama a los endpoints que usa Android y compara la forma (campos y tipos) de cada respuesta con su ejemplo en `backend/tests/contracts/fixtures/*.json`. Si la forma cambió, la prueba falla y dice qué campo.
- **Android:** `android/app/src/test/java/com/diplomado/erp/contracts/ApiContractsTest.kt` lee esos mismos JSON (copiados en `android/app/src/test/resources/contracts/`) con el mismo Gson que Retrofit y falla si un DTO no los puede leer o si un campo no nulo quedó en `null`.

**Regla: si cambias una respuesta de la API (campo nuevo, renombrado, id que pasa de objeto a texto, etc.):**
1. Regenera los fixtures: `cd backend && UPDATE_CONTRACTS=1 npx jest tests/contracts` (en PowerShell: `$env:UPDATE_CONTRACTS='1'; npx jest tests/contracts`).
2. Cópialos a Android: `node scripts/sync-contract-fixtures.js` (desde la raíz).
3. Ajusta los DTO de Android y corre sus pruebas de contrato: `cd android && .\gradlew.bat test`.
4. Sube los fixtures del backend, los de Android y los DTO en la misma tanda de commits.

Un endpoint nuevo que use Android se agrega en ambas pruebas (lista de `test.each` del backend y mapa `contracts` de Android). Los fixtures no llevan datos sensibles: tokens y tickets se reemplazan por marcadores, los ObjectId por ids fijos y las fechas por una fecha fija.

## Despliegue
- **Backend:** Render (`render.yaml`), `npm --prefix backend start`.
- **Web:** Cloudflare Workers con assets estáticos — `frontend/wrangler.toml` publica `frontend/dist` (generado con `npx expo export --platform web`).
- **Base de datos:** MongoDB Atlas (`MONGO_URI`, `mongodb+srv://…`).
- Variables de entorno: ver `.env.example` en la raíz. Los secretos viven solo en `.env` locales y en el panel de Render/Cloudflare.

## Identidad visual "FAI Solution ERP"
| Rol | Color | Token |
|---|---|---|
| Olivo (marca, barras de gráficas, encabezados) | `#334024` | `COLORS.primary`, `COLORS.chartBar`, `COLORS.sidebarBg` |
| Crema (fondo, texto sobre olivo) | `#F5EEDB` | `COLORS.textInverted`, `COLORS.sidebarText` (fondo general `COLORS.background`) |
| Salvia (indicador activo, acentos suaves) | `#C0CB87` | `COLORS.sidebarActiveIndicator` |
| Terracota (acción destacada, alertas) | `#CB623B` | `COLORS.accent`, `COLORS.statusNegativeDot` |

- **Estados** con tokens: `statusPositive*`, `statusNeutral*`, `statusPending*`, `statusNegative*` (`Bg`, `Border`, `Text`, `Dot`), además de `success`, `warning`, `error`, `trendUp*` y `trendDown*`.
- **Reglas:**
  - Sin colores escritos a mano en pantallas: siempre `COLORS.*` (y `SPACING`, `RADIUS`, `TYPOGRAPHY`). Si falta un color, se agrega como token.
  - Sin emojis como íconos: usa `TTIcon`.
  - Gráficas: barras olivo con opacidad media; el periodo en curso, olivo sólido.
  - Los reportes PDF/Excel usan la misma paleta (olivo `#334024`, crema `#F5EEDB`).
  - En Android, los mismos valores viven en `Color.kt` / `FaiTheme`.

## Reglas de trabajo
1. **Multiempresa:**
   - Todo documento de negocio lleva `companyId`, y toda consulta filtra por él (`BaseRepository` lo exige).
   - El `companyId` sale **siempre del token** (`req.user.companyId`), nunca del body, la query ni los headers.
   - Un ID de otra empresa responde 404.
2. **Permisos:**
   - Formato `modulo.accion` o `modulo.recurso.accion` (p. ej. `reports.read`, `reports.export`, `sales.orders.approve`), definidos en `backend/src/config/permissions.js`.
   - Backend: `authorize('permiso')` en **todas** las rutas protegidas.
   - Frontend: `can('permiso')` para mostrar u ocultar acciones. La interfaz nunca reemplaza la validación del backend.
3. **Auditoría:** `audit.middleware` registra toda escritura (POST/PUT/PATCH/DELETE bajo `/api/v1`, excepto `/auth`) con quién, qué, cuándo, antes y después.
4. **Validación:** Zod en toda entrada, con esquemas `.strict()`; el servidor calcula totales y folios.
5. **Documentos inmutables:**
   - Ingresos y gastos no se editan ni se borran: se **anulan** (`VOID`).
   - Pedidos y órdenes solo se editan en `DRAFT`.
   - Aprobar un pedido de venta genera sus salidas de inventario y su ingreso (cuenta `VENTAS`). Aprobar una orden de compra genera sus entradas de inventario.
6. **Secretos:** nunca subir `.env` (están en `.gitignore`) ni escribir credenciales o la URL de Atlas en el código. Mantener `.env.example` al día con valores ficticios.
7. **Git:**
   - Agregar archivos **por nombre**; nunca `git add .` ni `git add -A`.
   - No aplicar stashes ajenos ni tocar `android/` o `render.yaml` si la tarea no lo pide.
8. **Antes de subir:**
   - `npm test` en `backend/`: todo en verde. No se borran ni se saltan pruebas que fallan.
   - `npx expo export --platform web` en `frontend/`: sin errores.
   - Si tocaste `android/` o una respuesta de la API: `.\gradlew.bat test` y `.\gradlew.bat assembleDebug` en `android/` (si `JAVA_HOME` no está, usa el `jbr` de Android Studio).
   - Abrir `npm run web` y revisar que la consola no tenga errores rojos.
9. **Dudas de negocio** (fiscal, contable): no adivinar; dejar `TODO(QA):` y reportarlo.

## Decisión vigente sobre dinero
Los montos se guardan como **`Number`** en MongoDB y se redondean a **2 decimales** en el servidor. Todo cálculo de totales usa `Math.round(n * 100) / 100`, y el cliente nunca envía totales ni saldos. Es la decisión actual del proyecto; cambiarla requiere una migración planeada y un ADR nuevo.

## Comandos útiles
Desde `backend/`:
```
npm test                       # todas las pruebas (Jest, BD en memoria)
npm run test:unit              # sólo unitarias
npm run test:integration       # sólo integración
npx jest tests/contracts       # contratos API ↔ Android (UPDATE_CONTRACTS=1 regenera fixtures)
npm run dev                    # API con recarga (nodemon)
npm run indexes                # crea/sincroniza índices en la BD de MONGO_URI

# Datos demo (marca "seed:demo-sales"; piden escribir "si"; --dry-run sólo resume)
npm run seed:sales -- --company=FAI-XXXXXX --count=10000 [--with-finance] [--dry-run]
node src/scripts/seed-finance.js --company=FAI-XXXXXX [--dry-run]
npm run seed:sales:remove -- --company=FAI-XXXXXX [--dry-run]
```
- `seed:sales` crea ventas, clientes y productos demo con sus salidas de inventario.
- `seed-finance.js` crea proveedores, compras (con sus entradas), los ingresos de las ventas aprobadas y los gastos, con un margen mensual de 8–20 %. Se puede ejecutar varias veces sin duplicar.
- `seed:sales:remove` borra todo lo demo de la empresa y revierte existencias y saldos.

Desde `frontend/`:
```
npm run web                    # servidor de desarrollo web
npx expo export --platform web # build estático en dist/
```

## Formato de reporte al terminar cada tarea
```
## Reporte de tarea
### Resumen
### Archivos creados / modificados
### Comandos ejecutados y resultado
### Decisiones tomadas
### Pendientes y dudas (TODO(QA))
### Cómo probarlo manualmente
```
