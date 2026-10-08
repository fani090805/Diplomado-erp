# Paridad de funcionalidades: Web ↔ Android

Revisado contra el código real de `frontend/src/` y `android/app/src/main/` (8 oct 2026).
✅ = completo · Parcial = existe con faltantes (ver nota) · ❌ = no existe.
Se actualiza al terminar cada fase de [android/PLAN_ANDROID_FAI.md](android/PLAN_ANDROID_FAI.md).

| Funcionalidad | Web | Android | Notas |
|---|---|---|---|
| **Cuentas** | | | |
| Login | ✅ | ✅ | |
| Crear cuenta: unirse con código | ✅ | ❌ | Web: `RegisterScreen` modo `join` (`POST /auth/register`). |
| Crear cuenta: registrar empresa | ✅ | ❌ | Web: `CompanyRequestForm` (`POST /auth/register-company`). |
| Requisitos de contraseña visibles | ✅ | ❌ | Web: `PasswordRequirements`. |
| Recuperar contraseña | ✅ | ❌ | Web: `ForgotPasswordScreen` y `ResetPasswordScreen`. |
| Avisos de cuenta pendiente / en revisión (ámbar) | ✅ | ❌ | Android lee `body()` en respuestas de error, que en Retrofit siempre es null: muestra "Credenciales inválidas" para todo. |
| Avisos de empresa suspendida / credenciales (rojo) | ✅ | Parcial | Android siempre muestra el mismo texto genérico en rojo, no el mensaje del servidor. |
| Mi perfil / cambiar contraseña | ❌ | ❌ | El backend tiene `POST /auth/change-password` y `ErpApi.changePassword`, pero ninguna pantalla los usa. |
| **Inicio** | | | |
| Dashboard: KPIs | ✅ | ✅ | |
| Dashboard: gráfica semanal / mensual / anual | ✅ | Parcial | Web: `series` con `groupBy=week\|month`. Android solo usa `byMonth` y cambia el rango de días, así que "Semanal" muestra meses. |
| Dashboard: actividad reciente | ✅ | ✅ | |
| Eventos en vivo (SSE) | ✅ | ✅ | Android: `LiveEvents` y `refreshOnLive` en las listas actuales. |
| Configuración compartida `/meta` | ✅ | ✅ | Android: estados (`TTBadge`) y menú (`navSections`). |
| **Administración** | | | |
| Usuarios: lista | ✅ | Parcial | Android: una sola lista, sin pestañas Activos / Pendientes / Inactivos. |
| Usuarios: crear | ✅ | Parcial | Android abre el formulario con la contraseña `Password123!` ya escrita. |
| Usuarios: pendientes, aprobar con rol, rechazar | ✅ | ❌ | |
| Usuarios: desactivar / reactivar | ✅ | ❌ | |
| Usuarios: eliminar | ✅ | Parcial | Android elimina, pero no muestra el 409 informativo del servidor. |
| Código de empresa (copiar / generar nuevo) | ✅ | ❌ | Web: `CompanyJoinCodeCard` (Copiar y Generar nuevo; no tiene Compartir). |
| Roles | ✅ | ❌ | Web: crear, editar y eliminar. |
| Sucursales | ✅ | ❌ | Web: crear, editar y eliminar. |
| Auditoría | ✅ | ✅ | |
| **Ventas y compras** | | | |
| Ventas: lista | ✅ | ✅ | Android solo muestra la página 1 (20 pedidos). |
| Ventas: detalle | ✅ | ❌ | |
| Ventas: crear | ✅ | ❌ | Android muestra "Nuevo pedido", pero el botón no hace nada. |
| Ventas: aprobar | ✅ | ✅ | |
| Ventas: rechazar | ✅ | ❌ | |
| Compras: lista | ✅ | ✅ | Solo página 1. |
| Compras: detalle | ✅ | ❌ | |
| Compras: crear | ✅ | ❌ | "Nueva orden" sin acción. |
| Compras: aprobar / rechazar | ✅ | ✅ | |
| Clientes | ✅ | ❌ | Web: crear, editar y eliminar. |
| Proveedores | ✅ | ❌ | Web: crear, editar y eliminar. |
| **Inventario** | | | |
| Productos: activos / inactivos (desactivar, reactivar, eliminar) | ✅ | ✅ | |
| Productos: crear / editar | ✅ | ❌ | "Nuevo producto" sin acción. |
| Existencias: lista y stock bajo | ✅ | ✅ | |
| Existencias: tarjetas resumen | ✅ | ❌ | |
| Existencias: registrar entrada / salida | ✅ | ❌ | Web: `MovementFormModal` (`/inventory/entries`, `/inventory/exits`). |
| Movimientos: lista | ✅ | ✅ | |
| Movimientos: filtro por tipo | ✅ | ❌ | El ViewModel acepta `type`, pero la pantalla no tiene el filtro. |
| Almacenes | ✅ | ❌ | |
| Conteos de inventario | ✅ | ❌ | |
| **Finanzas** | | | |
| Cuentas | ✅ | Parcial | Android solo muestra la lista. |
| Ingresos (registrar, anular) | ✅ | ❌ | |
| Gastos (registrar, anular) | ✅ | ❌ | |
| Presupuestos | ✅ | ❌ | |
| Analítica (KPIs, ventas, compras, finanzas, presupuestos, inventario) | ✅ | ❌ | Web: `ReportsScreen` (sin `groupBy`, que solo usa el Dashboard). |
| Exportar ventas a PDF / Excel | ✅ | ❌ | Web: `SalesExportButton` (`/reports/sales/export`, permiso `reports.export`). |
| Exportar movimientos financieros a CSV | ✅ | ❌ | |
| **Módulos de negocio** | | | |
| CRM (leads) | ✅ | Parcial | Android: solo lista. |
| RRHH (empleados) | ✅ | Parcial | Android: solo lista. |
| Obras y centros de costo | ❌ | Parcial | La web no tiene pantalla. Android: lista y detalle, sin crear ni editar. |
| Producción: listas de materiales | ✅ | ❌ | `ErpApi` tiene `getBoms`, pero no hay pantalla. |
| Producción: órdenes (liberar, terminar, cancelar) | ✅ | ❌ | `ErpApi` tiene las llamadas, pero no hay pantalla. |
| **Plataforma** | | | |
| Panel de super admin: Solicitudes, Empresas, Rechazadas | ✅ | ❌ | Web: `CompaniesScreen` (aprobar, rechazar, suspender y reactivar). |
| **App** | | | |
| Ícono de la app | ✅ | Parcial | Android: `fai_logo.png` como ícono; no es adaptativo. |
| Splash | ✅ | ❌ | Web: `splash` en `app.json`. |
| Mensajes del servidor tal cual en errores | ✅ | Parcial | Solo Productos lee `errorBody()`; las otras 9 pantallas muestran un texto genérico. |

## Conteo (58 funcionalidades)

| | ✅ | Parcial | ❌ |
|---|---|---|---|
| Web | 56 | 0 | 2 |
| Android | 13 | 11 | 34 |
