# Plan de Android — FAI Solution ERP

Objetivo: que la app Android (`com.diplomado.erp`) llegue a la paridad con la web.
El estado actual, funcionalidad por funcionalidad, está en [../PARITY.md](../PARITY.md).

## Reglas para todas las fases
- Trabajar **solo en `android/`**. `backend/` y `frontend/` se leen como referencia y no se modifican, salvo que una fase lo diga.
- Kotlin nativo + Jetpack Compose, con `FaiTheme`, componentes `TT*` y `ColorTokens.kt`. Los colores solo se cambian en `design/tokens.json`.
- Las etiquetas de estado y el menú salen de `/meta` (`AppMeta`). Cada lista nueva se refresca con los eventos en vivo (`refreshOnLive`).
- Permisos iguales a los de la web (`PermissionChecker.hasPermission`). Textos en español, montos en MXN y nunca datos inventados (si falta un dato, "—").
- Cada pantalla tiene esqueleto de carga, pull-to-refresh, estado vacío, error con "Reintentar" y los mensajes del servidor tal cual.
- Contratos: cada endpoint nuevo se agrega a `backend/tests/contracts` y a `ApiContractsTest` (ver "Paridad" en `AGENTS.md`).
- Al terminar cada fase:
  1. `.\gradlew.bat test` y `.\gradlew.bat assembleDebug` (si `JAVA_HOME` no está, usar el `jbr` de Android Studio).
  2. Actualizar `PARITY.md`.
  3. Un commit por fase, solo con los archivos tocados y agregados por nombre. Nunca `.gradle`, `local.properties`, `app/build` ni `.env`; nunca `git add .` ni `git add -A`.
  4. Push a `main` y reporte.

## Base común (se hace al empezar la Fase 1)
- Helper para leer `errorBody()` (`{ error: { code, message } }`). Hoy solo Productos lo hace; las otras 9 pantallas leen `body()`, que es null en respuestas de error, y muestran un texto genérico. Debe aplicarse a todos los ViewModels existentes.
- Paginación (`meta.page` / `meta.totalPages`) con "Cargar más" en las listas que hoy se cortan en la página 1.

## Fase 1 · Cuentas
- **Login:** enlaces "¿Olvidaste tu contraseña?" y "Crear cuenta".
  - Avisos ámbar: `ACCOUNT_PENDING` (cuenta pendiente) y `COMPANY_IN_REVIEW` (empresa en revisión).
  - Avisos rojos: empresa suspendida y credenciales incorrectas, con el mensaje del servidor.
- **Crear cuenta:** dos opciones.
  - "Registrar mi empresa": `POST /auth/register-company`.
  - "Unirme a mi empresa", con código de empresa: `POST /auth/register`.
  - Requisitos de contraseña que se marcan en salvia al cumplirse, igual que `PasswordRequirements` de la web.
- **Recuperar contraseña:** `POST /auth/forgot-password`, con un mensaje neutro que no revela si el correo existe.

## Fase 2 · Administración
- **Usuarios** con pestañas Activos, Pendientes e Inactivos:
  - Aprobar con rol (`/users/:id/approve`) y rechazar.
  - Desactivar y reactivar.
  - Eliminar, mostrando el 409 informativo del servidor.
  - Quitar la contraseña `Password123!` que hoy viene ya escrita en "Nuevo usuario".
- **Tarjeta "Código de tu empresa"** (`/companies/me/join-code`): Copiar, Compartir (intent de Android) y Generar nuevo (`/regenerate`, con confirmación).
- **Configuración:**
  - Sucursales.
  - Roles en solo lectura.
  - Auditoría (ya existe; se mueve aquí).
- **Mi perfil:** datos de la sesión y cambiar contraseña (`POST /auth/change-password`). La web todavía no tiene esta pantalla.

## Fase 3 · Operación
- **Ventas y Compras:**
  - Detalle de la orden.
  - Crear: hoy "Nuevo pedido" y "Nueva orden" no hacen nada.
  - Aprobar y rechazar con motivo.
- **Clientes y Proveedores:** crear y editar.
- **Existencias:**
  - Tarjetas resumen.
  - "Nuevo producto" (hoy no hace nada).
  - Registrar entrada y salida (`/inventory/entries`, `/inventory/exits`).
- **Movimientos:** filtro por tipo (Entrada, Salida, Ajuste, Transferencia).

## Fase 4 · Finanzas, analítica y reportes
- **Finanzas** con Cuentas, Ingresos y Gastos: registrar y anular, sin editar ni borrar.
- **Analítica:**
  - `groupBy=day|week|month`.
  - Comparativo justo: el mismo tramo del periodo anterior, como la web.
- **Dashboard:** "Semanal" con `groupBy=week` sobre `series` (hoy reutiliza `byMonth`).
- **Exportar PDF / Excel** (permiso `reports.export`, `/reports/sales/export`):
  - Timeout de 90 s.
  - Archivo vía `FileProvider` y hoja de compartir.

## Fase 5 · Módulos de negocio
- CRM (leads), RRHH (empleados) y Obras (con centros de costo): crear y editar.
- **Producción:**
  - Listas de materiales.
  - Órdenes con liberar, terminar y cancelar (`/production/orders/:id/release|done|cancel`).

## Fase 6 · Super admin
- Si `isPlatformAdmin`: Plataforma → Empresas, con pestañas Solicitudes, Empresas y Rechazadas.
- Acciones: aprobar y rechazar solicitudes, suspender y reactivar empresas, igual que `CompaniesScreen` de la web.

## Fase 7 · Entrega
- Ícono adaptativo y splash (Android 12+ `SplashScreen`) con el cangrejo FAI.
- Revisión de accesibilidad (contentDescription, contraste, tamaños táctiles) y pantallas de 360 dp.
- Pruebas de ViewModels (`.\gradlew.bat test`).
- APK release firmado con keystore local; el keystore y sus contraseñas no se suben al repo.
  - Revisar reglas de R8: `minify` está activo en release y no hay `proguard-rules.pro`.
- `android/README.md` con instrucciones: JDK, compilar, probar, firmar e instalar.
