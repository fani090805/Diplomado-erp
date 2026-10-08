# Plan de Android — FAI Solution ERP

**Objetivo:** la app Android (Kotlin nativo + Jetpack Compose) hace TODO lo que hace la web, desde iniciar sesión hasta exportar reportes, con el mismo diseño FAI, los mismos textos y los mismos permisos.
La web (`frontend/`) es la referencia: pantalla por pantalla, la app tiene las mismas funciones adaptadas a celular.
El estado actual, funcionalidad por funcionalidad, está en [../PARITY.md](../PARITY.md).

## Reglas para todas las fases
- **Dónde se trabaja:** en `android/`; `backend/` y `frontend/` se leen como referencia.
  - Si una fase necesita un cambio en el backend, se hace con sus pruebas y con la actualización de los fixtures de contrato.
- **Paridad en ambos sentidos:** lo que Android tenga y la web no, se agrega TAMBIÉN a la web en la misma fase, con `npx expo export --platform web` sin errores.
  - Fase 2: "Mi perfil / cambiar contraseña".
  - Fase 5: Obras y centros de costo.
  - Excepción: "Compartir" el código de empresa queda solo en Android; en la web basta "Copiar".
- **Diseño:** Kotlin nativo + Jetpack Compose, `FaiTheme`, componentes `TT*` y `ColorTokens.kt`. Los colores solo se cambian en `design/tokens.json`.
- **Datos compartidos:** las etiquetas de estado y el menú salen de `/meta` (`AppMeta`). Cada lista se refresca con los eventos en vivo (`refreshOnLive`).
- **Igual que la web:** permisos (`PermissionChecker.hasPermission`), textos, validaciones y mensajes.
  - MXN y fechas en español.
  - Nunca datos inventados: si falta un dato, "—".
- **LISTAS (todas):**
  - Total real de registros, con miles (`meta.total`, p. ej. "1,200 órdenes").
  - Paginación infinita: al llegar al final se carga la siguiente página (`meta.page` / `meta.totalPages`), con indicador y sin duplicados al refrescar en vivo.
  - Búsqueda, y filtro de estado cuando la web lo tenga.
  - Tarjetas ordenadas:
    - A la izquierda: título o folio en negritas, y debajo subtítulo (cliente o proveedor) y fecha en gris.
    - A la derecha: el monto grande y el badge de estado debajo.
  - Al tocar una tarjeta se abre su detalle.
- **Cada pantalla:** esqueleto de carga, pull-to-refresh, estado vacío, error con "Reintentar" y los mensajes del servidor tal cual.
- **Contratos:**
  - Cada endpoint nuevo se agrega a `backend/tests/contracts` y a `ApiContractsTest` (ver "Paridad" en `AGENTS.md`).
  - Si cambia una respuesta de la API:
    1. `cd backend && UPDATE_CONTRACTS=1 npx jest tests/contracts`.
    2. `node scripts/sync-contract-fixtures.js`.
    3. `.\gradlew.bat test`.
- **Al terminar cada fase:**
  1. `.\gradlew.bat test` y `.\gradlew.bat assembleDebug` (si `JAVA_HOME` no está, usar el `jbr` de Android Studio).
  2. Si se tocó el backend, también `npm test` en `backend/`; si se tocó la web, `npx expo export --platform web` en `frontend/`.
  3. Actualizar `PARITY.md`.
  4. Un commit por fase, solo con los archivos tocados y agregados por nombre. Nunca `.gradle`, `local.properties`, `app/build` ni `.env`; nunca `git add .` ni `git add -A`.
  5. Push a `main` y reporte con capturas descritas de lo que se debe ver.

## Fase 1 · Cuentas (igual que la web)
- **Base común (lo primero de la fase): mensajes reales del servidor.**
  - Helper para leer `errorBody()` de Retrofit (`{ error: { code, message, details } }`).
  - Se aplica a TODAS las pantallas existentes, no solo a las nuevas. Hoy solo Productos lo hace; las otras 9 pantallas leen `body()`, que es null en respuestas de error, y muestran un texto genérico.
- **Bienvenida (landing)** con "Iniciar sesión" y "Crear cuenta".
- **Login:**
  - "¿Olvidaste tu contraseña?".
  - Avisos ámbar: `ACCOUNT_PENDING` (pendiente) y `COMPANY_IN_REVIEW` (en revisión).
  - Avisos rojos: empresa suspendida y credenciales incorrectas, con el mensaje del servidor.
  - El logo FAI funciona como botón para volver a la bienvenida.
- **Crear cuenta:**
  - "Registrar mi empresa" (`POST /auth/register-company`).
  - "Unirme a mi empresa", con código (`POST /auth/register`).
  - Requisitos de contraseña que se marcan en salvia al cumplirse (`PasswordRequirements` de la web).
- **Recuperar contraseña:** `POST /auth/forgot-password`, con un mensaje neutro que no revela si el correo existe.
- **Avatar:** iniciales de nombre y apellido (ya existe), y cerrar sesión desde el avatar con confirmación (ya existe; verificar).

## Fase 2 · Administración
- **Usuarios** con pestañas Activos, Pendientes e Inactivos, siguiendo las reglas de LISTAS:
  - Aprobar con rol y rechazar.
  - Desactivar y reactivar.
  - Eliminar, mostrando el 409 informativo del servidor.
  - Quitar la contraseña `Password123!` que hoy viene ya escrita en "Nuevo usuario".
- **Tarjeta "Código de tu empresa"** (`/companies/me/join-code`): Copiar, Compartir (intent de Android) y Generar nuevo (`/regenerate`, con confirmación).
- **Sucursales.**
- **Roles** en solo lectura.
- **Auditoría:** búsqueda, filtros y detalle con "antes" y "después".
  - **Backend:** corregir `backend/src/middlewares/audit.middleware.js`. Hoy `audit_logs.before` guarda los ObjectId como `{ buffer: {…} }` en vez de texto; debe convertirlos (y las fechas) a texto antes de guardar, con prueba del backend.
  - Quitar la normalización de `buffer` (y su `TODO(QA)`) de `backend/tests/contracts/api-contracts.test.js`, y regenerar y sincronizar los fixtures.
- **Mi perfil y cambiar contraseña** (`POST /auth/change-password`), en Android **y en la web** (hoy ninguna lo tiene).

## Fase 3 · Operación
- **Componentes reutilizables para las reglas de LISTAS** (antes de las pantallas):
  - Lista paginada con carga al final.
  - Tarjeta de documento: folio, subtítulo y fecha · monto y badge.
  - Barra de búsqueda y filtros.
  - Pantalla de detalle.
- **Ventas y Compras:**
  - Lista con las reglas de LISTAS, filtro de estado y búsqueda.
  - Detalle con líneas y totales.
  - Crear y editar borrador: hoy "Nuevo pedido" y "Nueva orden" no hacen nada.
  - Aprobar y rechazar con motivo.
- **Clientes y Proveedores:** crear y editar.
- **Productos:** activos e inactivos (ya existe). Alinear con las reglas de LISTAS y agregar crear y editar.
- **Existencias:**
  - Tarjetas resumen y filtros por producto y almacén.
  - "Nuevo producto".
  - Registrar entrada y salida (`/inventory/entries`, `/inventory/exits`).
- **Movimientos:** filtro por tipo (Entrada, Salida, Ajuste, Transferencia).
- **Almacenes** (crear, editar, eliminar), igual que `WarehousesScreen` de la web.
- **Conteos de inventario (inventarios físicos)**, igual que `CountsScreen` de la web.

## Fase 4 · Finanzas, analítica y reportes
- **Finanzas:**
  - Cuentas.
  - Ingresos y gastos: registrar y anular, sin editar ni borrar.
  - Presupuestos (planeado vs ejecutado), igual que `BudgetsScreen` de la web.
- **Analítica** con las mismas pestañas que `ReportsScreen` de la web: KPIs, Ventas, Compras, Finanzas, Presupuestos e Inventario.
- **Gráfica del Dashboard** con `series` y `groupBy`, igual que `HomeScreen.js` (hoy reutiliza `byMonth`):
  - Semanal: `week`, 8 semanas.
  - Mensual: `month`, 6 meses.
  - Anual: `month`, 12 meses.
  - Se rellenan los periodos sin datos.
  - Comparativo justo: del día 1 a hoy contra el mismo tramo del mes anterior.
- **Exportar PDF / Excel** (permiso `reports.export`, `/reports/sales/export`):
  - Timeout de 90 s.
  - Archivo vía `FileProvider` y hoja de compartir.
- **Exportar finanzas a CSV** (`/reports/finance/export`), igual que la web, con la misma hoja de compartir.

## Fase 5 · Módulos de negocio
- CRM (leads), RRHH (empleados), Obras y Centros de costo: crear y editar, con las reglas de LISTAS.
- **Web:** pantalla de Obras y centros de costo (hoy no existe), con las mismas funciones que Android.
- **Producción:**
  - Listas de materiales.
  - Órdenes con liberar, terminar y cancelar (`/production/orders/:id/release|done|cancel`).

## Fase 6 · Super admin
- Si `isPlatformAdmin`: Plataforma → Empresas, con pestañas Solicitudes, Empresas y Rechazadas.
- Acciones: aprobar y rechazar solicitudes, suspender y reactivar empresas, igual que `CompaniesScreen` de la web.

## Fase 7 · Entrega
- Ícono adaptativo y splash (Android 12+ `SplashScreen`) con el cangrejo FAI.
- `android/app/proguard-rules.pro`:
  - Reglas para Gson, Retrofit y OkHttp (incluido okhttp-sse).
  - Mantener los DTO de `core/network/dto` (campos con `@SerializedName` y firmas genéricas de `ApiResponse<T>`).
- Probar el APK release en el emulador antes de entregarlo: login, Dashboard, Ventas, Compras, Existencias y eventos en vivo, sin errores `FAI-API` en logcat.
- Accesibilidad (contentDescription, contraste, tamaños táctiles) y pantallas de 360 dp.
- Pruebas de ViewModels (`.\gradlew.bat test`).
- APK release firmado con keystore local; el keystore y sus contraseñas no se suben al repo.
- `android/README.md`: cómo abrir el proyecto, correrlo, generar el APK e instalarlo.
