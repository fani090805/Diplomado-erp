# PLAN DE ADAPTACIÓN Y ARQUITECTURA ANDROID: ERP CONSTRUCTOR (Tec[ode)

Este documento define la estrategia técnica, análisis de componentes y mapa de ruta para convertir la aplicación del repositorio `https://github.com/nenegamer542-tech/Diplomado` en la aplicación móvil Android nativa **ERP Constructor** bajo la marca **Tec[ode**.

---

## 1. CONCEPTO Y CAMBIO PARADIGMÁTICO

El ERP original es un sistema empresarial multiempresa general. Para el sector de la construcción, la arquitectura se reorganiza bajo una jerarquía conceptual orientada a proyectos y obras:

```text
Empresa (Multi-tenant)
  └── Obras / Proyectos (Projects)
        └── Centros de Costo (Cost Centers)
              └── Operaciones & Documentos (Materiales, Compras, Gastos, Personal, Maquinaria)
                    └── Reportes & Trazabilidad Inmutable
```

Cada transacción importante (movimiento de material, orden de compra, gasto, avance de producción) se vincula conceptualmente con:
- **Empresa** (`companyId`)
- **Obra** (`projectId`)
- **Centro de costo** (`costCenterId`)
- **Documento de origen** (`code` / `reference`)
- **Usuario responsable** (`createdBy`)
- **Fecha & Estado** (`createdAt`, `status`)

---

## 2. TABLA DE MAPEO Y ADAPTACIÓN DE MÓDULOS

| Módulo Actual | Adaptación ERP Constructor | Reutilizar | Nuevo Endpoint / Extensión | Prioridad |
| :--- | :--- | :--- | :--- | :--- |
| **Autenticación (`/auth`)** | Autenticación Segura Tec[ode con Keystore | 100% | Ninguno (Usa `/auth/login`, `/auth/refresh`, `/auth/me`) | Alta (Fase 1) |
| **Empresas (`/companies`)** | Empresa Constructora Multi-tenant | 100% | Ninguno (Usa `/companies/me`) | Alta (Fase 2) |
| **Usuarios/Roles (`/users`, `/roles`)** | Responsables de Obra, Cuadrillas, Directores | 100% | Ninguno (RBAC existente) | Alta (Fase 2) |
| **Obras (Nuevo)** | Módulo Central "Mis Obras" | Parcial (`/master-data`) | `/projects` (GET/POST/PATCH/DELETE) | Alta (Fase 3) |
| **Centros de Costo (Nuevo)** | Centros de Costo por Obra | Parcial (`/finance/budgets`) | `/cost-centers` (GET/POST/PATCH/DELETE) | Alta (Fase 3) |
| **Productos (`/products`)** | Catálogo de Materiales de Construcción | 100% | Extensión con `unit`, `trackingMode` | Alta (Fase 4) |
| **Almacenes (`/warehouses`)** | Bodegas de Obra / Almacén Central | 100% | Ninguno (`/warehouses`) | Alta (Fase 4) |
| **Inventario (`/inventory`)** | Existencias y Movimientos de Materiales | 100% | Trazabilidad por Lote/Serie + Conteos | Alta (Fase 4) |
| **Proveedores (`/suppliers`)** | Proveedores de Materiales y Maquinaria | 100% | Ninguno (`/suppliers`) | Alta (Fase 5) |
| **Compras (`/purchase-orders`)** | Órdenes de Compra para Obra | 100% | Añadir `projectId`, `costCenterId` en payload | Alta (Fase 5) |
| **Clientes (`/customers`)** | Desarrolladoras, Contratantes, Gobierno | 100% | Ninguno (`/customers`) | Alta (Fase 5) |
| **Ventas (`/sales-orders`)** | Contratos y Estimaciones de Obra | 100% | Añadir `projectId` en payload | Alta (Fase 5) |
| **Finanzas (`/finance`)** | Cuentas, Ingresos y Gastos de Obra | 100% | Añadir `projectId`, `costCenterId` | Alta (Fase 6) |
| **Documentos (Transversal)** | Visor de Documentos de Obra (PO, SO, EXP, INC) | 100% | Agregador sobre endpoints existentes | Alta (Fase 7) |
| **Auditoría (`/audit`)** | Trazabilidad e Historial Inmutable | 100% | Ninguno (`/audit`) | Alta (Fase 7) |
| **Reportes (`/reports`)** | Reportes de Avance, Ejecución y Materiales | 100% | Extensión con filtro `projectId` | Alta (Fase 7) |
| **Maquinaria (Futuro)** | Control de Equipos y Maquinaria de Obra | 80% (`/products`) | Extensión de tipo de producto `EQUIPMENT` | Media (Fase 9) |

---

## 3. ANÁLISIS DE REUTILIZACIÓN Y CAMBIOS NECESARIOS

### 3.1. Lo que se Reutiliza Directamente
1. **Backend REST API Node.js/Express (`/api/v1`)**: No se crea un backend nuevo. Todas las llamadas se realizan a la API REST de producción desplegada en Render (`https://diplomado-cte0.onrender.com/api/v1`).
2. **Aislamiento Multi-tenant (`companyId`)**: Garantizado por `BaseRepository` y middlewares de sesión en el backend. Android nunca manipula manualmente `companyId`.
3. **Seguridad JWT + RBAC**: Rotación de tokens con `jti`, almacenamiento en **Android Keystore** con `EncryptedSharedPreferences`.
4. **Catálogo de Materiales, Proveedores, Clientes, Inventarios y Finanzas**: Módulos backend probados y funcionales.

### 3.2. Lo que se Renombra y Rediseña
1. **Identidad Visual**: Marca **Tec[ode**, Nombre de la Aplicación **ERP Constructor**.
2. **Productos → Materiales**: Los productos con atributos `sku`, `unit`, `trackingMode` (lote/serie) representan materiales de construcción (cemento, varilla, arena, etc.).
3. **Dashboard Generico → Dashboard de Construcción**: Pantalla orientada a presupuesto de obras, gastos acumulados, avance financiero, alertas de stock bajo y compras pendientes.
4. **Vistas de Detalle → Centro de Control de Obra ("Mis Obras")**: Tarjetas de obra con barra de progreso, presupuesto ejecutado vs. disponible y pestañas navegables.

### 3.3. Incorporación de Obras y Centros de Costo
1. **Módulo de Obras (`/projects`)**: Permite vincular cada proyecto de construcción con cliente, ubicación, responsable, presupuesto global, fechas y estado (`PLANEADA`, `EN_PROCESO`, `PAUSADA`, `FINALIZADA`, `CANCELADA`).
2. **Centros de Costo (`/cost-centers`)**: Permite clasificar las erogaciones y consumos de cada obra en partidas (Materiales, Mano de Obra, Maquinaria, Subcontratos, Gastos Indirectos).
3. **Vinculación de Transacciones**: Órdenes de compra (`purchase-orders`), gastos (`expenses`), movimientos de inventario (`inventory`) y presupuestos aceptan los campos opcionales `projectId` y `costCenterId`.

---

## 4. ARQUITECTURA MÓVIL ANDROID NATIVA

```text
android/app/src/main/java/com/diplomado/erp/
├── core/
│   ├── common/         # Utilidades, result wrappers, mappers
│   ├── ui/             # Tecode Design System (Theme, Colors, Typography, Components)
│   ├── navigation/     # NavGraph Compose, Screens sealed class, NavigationRail/BottomBar
│   ├── network/        # Retrofit, OkHttp, AuthInterceptor, TokenAuthenticator, ErpApi
│   ├── security/       # TokenStorage (Android Keystore / EncryptedSharedPreferences)
│   └── datastore/      # Preferencias locales y caché
└── features/
    ├── auth/           # LoginScreen, LoginViewModel, AuthRepository
    ├── dashboard/      # DashboardScreen, DashboardViewModel
    ├── projects/       # ProjectsScreen, ProjectDetailScreen, ProjectsViewModel
    ├── materials/      # ProductsScreen (Materiales), ProductsViewModel
    ├── inventory/      # StockScreen, MovementsScreen, InventoryViewModel
    ├── purchases/      # PurchaseOrdersScreen, SuppliersScreen, PurchasesViewModel
    ├── sales/          # SalesOrdersScreen, CustomersScreen, SalesViewModel
    ├── finance/        # AccountsScreen, ExpensesScreen, FinanceViewModel
    ├── documents/      # DocumentsScreen, DocumentsViewModel
    ├── reports/        # ReportsScreen, ReportsViewModel
    └── audit/          # AuditScreen, AuditViewModel
```

---

## 5. PLAN DE IMPLEMENTACIÓN POR FASES

### FASE 1: BRANDING, ESTRUCTURA BASE Y AUTENTICACIÓN (EN EJECUCIÓN)
- [x] Análisis del repositorio y creación del plan `ANDROID_ERP_CONSTRUCTOR_PLAN.md` y `ERP_CONSTRUCTOR_MODULES.md`.
- [x] Configuración de la estructura nativa Android Kotlin + Jetpack Compose Material 3.
- [x] Reutilización e integración del componente vector oficial **Tec[ode** (`TecodeLogo.kt`).
- [x] Nombre público visible de la aplicación: **ERP Constructor**.
- [x] Splash Screen con marca **Tec[ode** y nombre **ERP Constructor**.
- [x] Pantalla de Login con campos email/password, estado de carga, manejo de errores y consumo de la API REST de producción.
- [x] Almacenamiento seguro de tokens JWT en **Android Keystore** (`TokenStorage`).
- [x] Verificación de compilación y ejecución en dispositivo físico.

### FASES FUTURAS
- **FASE 2**: Dashboard para Construcción, Navegación Adaptativa y Menú Lateral Tec[ode.
- **FASE 3**: Módulo "Mis Obras" y Centros de Costo.
- **FASE 4**: Catálogo de Materiales e Inventario de Obra.
- **FASE 5**: Compras para Obra, Proveedores y Clientes.
- **FASE 6**: Finanzas de Obra (Gastos e Ingresos vinculados a Centros de Costo).
- **FASE 7**: Visor Transversal de Documentos y Auditoría.
- **FASE 8**: Módulos CRM, RRHH y Listas BOM.
- **FASE 9**: Módulo de Maquinaria y Equipos.
- **FASE 10**: Optimización Offline, Pruebas Integrales y Preparación para Release.
