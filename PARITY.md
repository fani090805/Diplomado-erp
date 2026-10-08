# Paridad de funcionalidades: Web ↔ Android

Revisado contra el código real de `frontend/src/` y `android/app/src/main/` (8 oct 2026).
✅ = completo · Parcial = existe con faltantes (ver nota) · ❌ = no existe.
La web es la referencia, y la paridad es en ambos sentidos: lo que Android tenga y la web no, se agrega también a la web en la misma fase (excepto "Compartir" el código de empresa).
Se actualiza al terminar cada fase de [android/PLAN_ANDROID_FAI.md](android/PLAN_ANDROID_FAI.md).

**Reglas de LISTAS** (aplican a cada módulo): total real de registros, paginación infinita, búsqueda, filtro de estado cuando la web lo tiene, tarjetas ordenadas y detalle al tocar. En la web, todas las listas usan `TTTable` + `useList`, que ya tienen paginación, total y búsqueda.

| Funcionalidad | Web | Android | Notas |
|---|---|---|---|
| **Cuentas** | | | |
| Landing / bienvenida con "Iniciar sesión" y "Crear cuenta" | ✅ | ❌ | Web: `LandingScreen`. Android abre directo en el login. |
| Login | ✅ | ✅ | |
| Login: "¿Olvidaste tu contraseña?" | ✅ | ❌ | |
| Login: logo FAI como botón para volver | ❌ | ❌ | En la web el logo no es botón. La Fase 1 lo agrega en Android. |
| Avisos ámbar: cuenta pendiente / empresa en revisión | ✅ | ❌ | Android lee `body()` en respuestas de error, que en Retrofit es siempre null: muestra "Credenciales inválidas" para todo. |
| Avisos rojos: empresa suspendida / credenciales | ✅ | Parcial | Android: texto genérico en rojo, no el mensaje del servidor. |
| Crear cuenta: unirse con código | ✅ | ❌ | Web: `RegisterScreen` (`POST /auth/register`). |
| Crear cuenta: registrar empresa | ✅ | ❌ | Web: `CompanyRequestForm` (`POST /auth/register-company`). |
| Requisitos de contraseña en salvia | ✅ | ❌ | Web: `PasswordRequirements`. |
| Recuperar / restablecer contraseña | ✅ | ❌ | Web: `ForgotPasswordScreen` y `ResetPasswordScreen`. |
| Avatar con iniciales | ✅ | ✅ | Android: `initialsOf` toma nombre y apellido. |
| Cerrar sesión desde el avatar | ✅ | ✅ | Android pide confirmación; la web cierra sin confirmar. |
| Mi perfil / cambiar contraseña | ❌ | ❌ | El backend tiene `POST /auth/change-password`; ninguna pantalla lo usa. Fase 2 lo agrega en web y Android. |
| **Inicio** | | | |
| Dashboard: KPIs | ✅ | ✅ | |
| Dashboard: comparativo justo (mes a la fecha vs. mismo tramo del mes anterior) | ✅ | ❌ | Android compara los dos últimos meses completos de `byMonth`. |
| Dashboard: gráfica semanal / mensual / anual | ✅ | Parcial | Web: `series` con `groupBy=week\|month`. Android solo usa `byMonth`, así que "Semanal" muestra meses. |
| Dashboard: actividad reciente | ✅ | ✅ | |
| Eventos en vivo (SSE) | ✅ | ✅ | Android: `LiveEvents` y `refreshOnLive` en las listas actuales. |
| Configuración compartida `/meta` | ✅ | ✅ | Estados (`TTBadge`) y menú (`navSections`). |
| Mensajes del servidor tal cual en errores | ✅ | Parcial | Solo Productos lee `errorBody()`; las otras 9 pantallas muestran un texto genérico. |
| **Administración** | | | |
| Usuarios: Activos / Pendientes / Inactivos | ✅ | ❌ | Android: una sola lista, sin total real ni paginación. |
| Usuarios: crear y editar | ✅ | Parcial | Android solo crea, y el formulario trae `Password123!` ya escrita. |
| Usuarios: aprobar con rol / rechazar | ✅ | ❌ | |
| Usuarios: desactivar / reactivar | ✅ | ❌ | |
| Usuarios: eliminar con 409 informativo | ✅ | Parcial | Android elimina, pero no muestra el 409 del servidor. |
| Código de tu empresa: Copiar / Generar nuevo | ✅ | ❌ | Web: `CompanyJoinCodeCard`. |
| Código de tu empresa: Compartir | n/a | ❌ | Solo Android (decisión); en la web basta "Copiar". |
| Roles | ✅ | ❌ | Web: crear, editar y eliminar. Android: solo lectura (Fase 2). |
| Sucursales | ✅ | ❌ | Web: crear, editar y eliminar. |
| Auditoría: lista | ✅ | Parcial | Android: solo los últimos `SUCCESS`, sin búsqueda, filtros ni detalle. |
| Auditoría: "antes" / "después" legibles | Parcial | Parcial | Backend: `audit_logs.before` guarda los ObjectId como `{ buffer: {…} }`. |
| **Ventas** | | | |
| Lista con total real y paginación | ✅ | Parcial | Android: solo la página 1 (20) y el subtítulo cuenta los cargados, no el total. |
| Búsqueda | ✅ | ❌ | |
| Filtro de estado | ✅ | ❌ | El ViewModel acepta `status`, pero la pantalla no tiene el filtro. |
| Tarjeta ordenada (folio, cliente, fecha · monto, badge) | ✅ | Parcial | Android: sin fecha; el monto va en el texto y no a la derecha. |
| Detalle con líneas y totales | ✅ | ❌ | Web: `DetailModal`. |
| Crear / editar borrador | ✅ | ❌ | Android muestra "Nuevo pedido", pero el botón no hace nada. |
| Aprobar | ✅ | ✅ | |
| Rechazar con motivo | ✅ | ❌ | |
| Exportar PDF / Excel | ✅ | ❌ | Web: `SalesExportButton` (`/reports/sales/export`, permiso `reports.export`). |
| **Compras** | | | |
| Lista con total real y paginación | ✅ | Parcial | Igual que Ventas. |
| Búsqueda / filtro de estado | ✅ | ❌ | |
| Tarjeta ordenada | ✅ | Parcial | |
| Detalle con líneas y totales | ✅ | ❌ | |
| Crear / editar borrador | ✅ | ❌ | "Nueva orden" sin acción. |
| Aprobar / rechazar | ✅ | ✅ | |
| Exportar | ❌ | ❌ | La web solo exporta Ventas. |
| **Catálogos** | | | |
| Clientes (lista, búsqueda, crear, editar, eliminar) | ✅ | ❌ | |
| Proveedores (lista, búsqueda, crear, editar, eliminar) | ✅ | ❌ | |
| Productos: activos / inactivos (desactivar, reactivar, eliminar) | ✅ | ✅ | |
| Productos: total, búsqueda | ✅ | ✅ | |
| Productos: paginación | ✅ | ❌ | Android: máximo 50. |
| Productos: crear / editar | ✅ | ❌ | "Nuevo producto" sin acción. |
| **Inventario** | | | |
| Existencias: lista y aviso de stock bajo | ✅ | ✅ | |
| Existencias: tarjetas resumen | ✅ | ❌ | |
| Existencias: filtros (producto / almacén) | ✅ | ❌ | |
| Existencias: nuevo producto, entrada, salida | ✅ | ❌ | Web: `ProductFormModal` y `MovementFormModal`. |
| Movimientos: lista con total | ✅ | Parcial | Android: máximo 50, sin paginación. |
| Movimientos: filtro por tipo | ✅ | ❌ | |
| Almacenes | ✅ | ❌ | |
| Inventarios físicos (conteos) | ✅ | ❌ | Web: `CountsScreen`. |
| **Finanzas** | | | |
| Cuentas: lista | ✅ | ✅ | |
| Cuentas: crear / editar / eliminar | ✅ | ❌ | |
| Ingresos (lista, filtro, registrar, anular) | ✅ | ❌ | |
| Gastos (lista, filtro, registrar, anular) | ✅ | ❌ | |
| Presupuestos | ✅ | ❌ | |
| Analítica: pestañas KPIs, Ventas, Compras, Finanzas, Presupuestos, Inventario | ✅ | ❌ | Web: `ReportsScreen`. |
| Exportar movimientos financieros a CSV | ✅ | ❌ | |
| **Módulos de negocio** | | | |
| CRM (leads): lista | ✅ | Parcial | Android: sin total real, búsqueda ni filtro. |
| CRM: crear / editar | ✅ | ❌ | |
| RRHH (empleados): lista | ✅ | Parcial | Android: sin total real ni búsqueda. |
| RRHH: crear / editar | ✅ | ❌ | |
| Obras: lista, búsqueda, detalle | ❌ | ✅ | La web no tiene pantalla; Fase 5 la agrega. |
| Obras: crear / editar | ❌ | ❌ | |
| Centros de costo: lista en el detalle de la obra | ❌ | ✅ | |
| Centros de costo: crear / editar | ❌ | ❌ | |
| Producción: listas de materiales | ✅ | ❌ | `ErpApi` tiene `getBoms`, pero no hay pantalla. |
| Producción: órdenes (liberar, terminar, cancelar) | ✅ | ❌ | `ErpApi` tiene las llamadas, pero no hay pantalla. |
| **Plataforma** | | | |
| Super admin: Solicitudes, Empresas y Rechazadas (aprobar, rechazar, suspender, reactivar) | ✅ | ❌ | Web: `CompaniesScreen`. |
| **App** | | | |
| Ícono | ✅ | Parcial | Android: `fai_logo.png`; no es adaptativo. |
| Splash | ✅ | ❌ | Web: `splash` en `app.json`. |
| Build release listo (R8) | n/a | ❌ | `minify` activo sin `proguard-rules.pro`. |

## Conteo (80 funcionalidades comparables)
Sin contar las filas con "n/a" ("Compartir" el código, que es solo de Android, y "Build release").

| | ✅ | Parcial | ❌ |
|---|---|---|---|
| Web | 72 | 1 | 7 |
| Android | 15 | 15 | 50 |
