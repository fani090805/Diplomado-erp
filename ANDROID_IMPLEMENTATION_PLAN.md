# PLAN DE IMPLEMENTACIÓN ANDROID NATIVO
## Diplomado ERP (`com.diplomado.erp`)

---

### 1. VISIÓN GENERAL Y OBJETIVO

Crear una aplicación móvil y tablet Android nativa profesional en **Kotlin** y **Jetpack Compose** para el sistema **Diplomado ERP**, consumiendo directamente la API REST existente (`/api/v1`) del backend Node.js + Express + MongoDB.

---

### 2. TECNOLOGÍAS Y LIBRERÍAS DE LA PLATAFORMA

- **Lenguaje**: Kotlin 1.9+ / 2.0+
- **UI Toolkit**: Jetpack Compose + Material 3 + Accompanist / Adaptive Navigation Layouts.
- **Navegación**: Navigation Compose (con Type-Safe Routes / Sealed Destination routes).
- **Arquitectura**: Clean Architecture + MVVM (Model-View-ViewModel) + Android Architecture Components.
- **Manejo Asíncrono**: Coroutines + Kotlin Flow / StateFlow / SharedFlow.
- **Red & Networking**: Retrofit 2 + OkHttp 4 + Interceptores de Auth & Logging.
- **Mapeo de Datos**: Kotlinx Serialization / Gson (Respuestas estandarizadas `{ success, data, meta, error }`).
- **Almacenamiento Seguro**: Android Keystore + EncryptedSharedPreferences / Encrypted DataStore (Tokens JWT Access/Refresh).
- **Base de Datos Local / Caché**: Room Database (Almacenamiento persistente offline de catálogos y consultas de solo lectura).
- **Preferencias**: Jetpack DataStore (Ajustes de usuario, tema, sesión y preferencias no sensibles).

---

### 3. ESTRUCTURA DE MÓDULOS Y PAQUETES (`com.diplomado.erp`)

```
com.diplomado.erp/
├── core/
│   ├── network/
│   │   ├── api/             # Retrofit interfaces (AuthApi, ProductApi, InventoryApi, etc.)
│   │   ├── dto/             # Network Data Transfer Objects (Request/Response)
│   │   ├── interceptors/    # AuthInterceptor (Bearer), TokenAuthenticator (Transparent 401 Refresh)
│   │   ├── model/           # ApiResult<T>, ApiError, NetworkError
│   │   └── client/          # OkHttpClient & Retrofit Provider
│   ├── security/
│   │   ├── KeystoreManager.kt
│   │   └── TokenStorage.kt  # Tokens protegidos con Android Keystore
│   ├── datastore/
│   │   └── UserPreferences.kt
│   ├── database/
│   │   ├── ErpDatabase.kt   # Room Database para caché offline
│   │   ├── dao/             # Data Access Objects
│   │   └── entity/          # Room Entities
│   └── common/
│       ├── rbac/
│       │   └── PermissionChecker.kt # Verificador de permisos RBAC ("products.create", etc.)
│       ├── util/
│       │   ├── CurrencyFormatter.kt
│       │   └── DateFormatter.kt
│       └── result/
│           └── Resource.kt  # Loading, Success, Error, Forbidden, Offline
├── ui/
│   ├── theme/
│   │   ├── Color.kt         # Paleta de colores TECTODE Dark Theme + Material 3 Light
│   │   ├── Type.kt          # Tipografía
│   │   ├── Shape.kt
│   │   └── Theme.kt
│   ├── components/
│   │   ├── TTTopBar.kt
│   │   ├── TTBottomBar.kt
│   │   ├── TTNavigationRail.kt
│   │   ├── TTStatCard.kt
│   │   ├── TTDataTable.kt
│   │   ├── TTBadge.kt
│   │   ├── TTLabeledTextField.kt
│   │   ├── TTSelectDropdown.kt
│   │   ├── TTEmptyState.kt
│   │   ├── TTErrorBanner.kt
│   │   └── TTLabeledDialog.kt
│   └── navigation/
│       ├── NavGraph.kt
│       └── NavDestination.kt
└── feature/
    ├── auth/
    │   ├── data/
    │   ├── domain/
    │   └── presentation/ (LoginScreen, LoginViewModel)
    ├── dashboard/
    │   └── presentation/ (DashboardScreen, DashboardViewModel)
    ├── inventory/
    │   ├── products/
    │   ├── warehouses/
    │   ├── stock/
    │   ├── movements/
    │   └── counts/
    ├── purchases/
    │   ├── suppliers/
    │   └── orders/
    ├── sales/
    │   ├── customers/
    │   └── orders/
    ├── finance/
    │   ├── accounts/
    │   ├── incomes/
    │   ├── expenses/
    │   ├── budgets/
    │   └── reports/
    ├── crm/
    │   └── leads/
    ├── hr/
    │   └── employees/
    ├── production/
    │   ├── boms/
    │   └── orders/
    └── configuration/
        ├── branches/
        ├── users/
        ├── roles/
        ├── audit/
        └── masterdata/
```

---

### 4. Mapeo de ENDPOINTS Y DTOs REST (`/api/v1`)

| Módulo | Endpoint REST | DTO / Modelo Kotlin | Métodos HTTP |
|---|---|---|---|
| Auth | `/auth/login` | `LoginRequest`, `LoginResponse` | POST |
| Auth | `/auth/refresh` | `RefreshRequest`, `RefreshResponse` | POST |
| Auth | `/auth/me` | `MeResponse` (`User`, `Role`, `Company`, `Branch`) | GET |
| Products | `/products` | `ProductDto`, `CreateProductRequest` | GET, POST |
| Products | `/products/:id` | `ProductDto`, `UpdateProductRequest` | GET, PATCH, DELETE |
| Warehouses | `/warehouses` | `WarehouseDto` | GET, POST, PATCH, DELETE |
| Inventory | `/inventory/stock` | `StockLevelDto` | GET |
| Inventory | `/inventory/movements` | `InventoryMovementDto` | GET |
| Inventory | `/inventory/entries` | `InventoryEntryRequest` | POST |
| Inventory | `/inventory/exits` | `InventoryExitRequest` | POST |
| Inventory | `/inventory/adjustments` | `InventoryAdjustmentRequest` | POST |
| Inventory | `/inventory/transfers` | `InventoryTransferRequest` | POST |
| Inventory | `/inventory/counts` | `InventoryCountDto`, `CreateCountRequest` | GET, POST, POST `/post` |
| Purchases | `/suppliers` | `SupplierDto` | GET, POST, PATCH, DELETE |
| Purchases | `/purchase-orders` | `PurchaseOrderDto`, `CreateOrderRequest` | GET, POST, PATCH, POST `/approve`, `/reject` |
| Sales | `/customers` | `CustomerDto` | GET, POST, PATCH, DELETE |
| Sales | `/sales-orders` | `SalesOrderDto`, `CreateSalesOrderRequest` | GET, POST, PATCH, POST `/approve`, `/reject` |
| Finance | `/finance/accounts` | `FinanceAccountDto` | GET, POST, PATCH, DELETE |
| Finance | `/finance/incomes` | `IncomeDto`, `VoidRequest` | GET, POST, POST `/void` |
| Finance | `/finance/expenses` | `ExpenseDto`, `VoidRequest` | GET, POST, POST `/void` |
| Finance | `/finance/budgets` | `BudgetDto` | GET, POST, PATCH, DELETE |
| Reports | `/reports/kpis` | `KpisResponse` | GET |
| Reports | `/reports/sales`, `/purchases` | `ReportSeriesResponse` | GET |
| Reports | `/reports/inventory`, `/finance` | `ReportCategoryResponse` | GET |
| Reports | `/reports/finance/export` | `ResponseBody` (CSV Text) | GET |
| CRM | `/crm/leads` | `LeadDto` | GET, POST, PATCH |
| HR | `/hr/employees` | `EmployeeDto` | GET, POST, PATCH |
| Production | `/production/boms` | `BomDto` | GET, POST, PATCH |
| Production | `/production/orders` | `ProductionOrderDto` | GET, POST, PATCH, POST `/release`, `/done`, `/cancel` |
| Config | `/users`, `/roles`, `/branches` | `UserDto`, `RoleDto`, `BranchDto` | GET, POST, PATCH, DELETE |
| Config | `/audit` | `AuditLogDto` | GET (Solo lectura) |
| Config | `/master-data/:type` | `MasterDataDto` | GET, POST, PATCH, DELETE |

---

### 5. ESTRATEGIA DE AUTENTICACIÓN Y SEGURIDAD

- **OkHttp AuthInterceptor**: Adiciona `Authorization: Bearer <accessToken>` en cada Petición.
- **OkHttp TokenAuthenticator**: Intercepta respuestas HTTP 401:
  1. Si `accessToken` expiró, ejecuta una llamada sincrónica/atómica a `/auth/refresh` con `refreshToken`.
  2. Si el refresh es exitoso (HTTP 200), guarda los nuevos tokens en Android Keystore/Encrypted Storage y reintenta la petición original.
  3. Si el refresh falla o devuelve 401/403 (Sesión revocada/expirada), emite un evento de `SessionExpired` al `AuthStateManager`, limpia los tokens y redirige al `LoginScreen`.
- **Android Keystore**: Cifra las claves de sesión antes de escribirlas en almacenamiento local.
- **RBAC Client-Side (`PermissionChecker`)**: Evalúa la lista `role.permissions` descargada en `/auth/me` para condicionar la renderización de elementos interactivos (`FAB`, botones de edición/aprobación/creación) y entradas de menú.

---

### 6. PLAN DE IMPLEMENTACIÓN EN FASES

- **FASE A — BASE DEL PROYECTO ANDROID**:
  - Estructura de archivos del proyecto Android (`build.gradle.kts`, `app/build.gradle.kts`, `AndroidManifest.xml`).
  - Configuración de Jetpack Compose, Material 3, Navigation Compose, Hilt / Dependency Injection y Retrofit/OkHttp.
  - Implementación del Design System TECTODE (Colores, Tipografía, Formas, Componentes base: `TTButton`, `TTTextField`, `TTCard`, `TTBadge`, `TTLoading`).
  - Base de red: `ApiResult`, `AuthInterceptor`, `TokenAuthenticator` y `NetworkSecurityConfig`.

- **FASE B — AUTENTICACIÓN Y SESIÓN**:
  - Pantalla de Login (`LoginScreen`, `LoginViewModel`).
  - Almacenamiento seguro de tokens (`KeystoreManager`, `TokenStorage`).
  - Verificación de sesión activa al abrir la app con `/auth/me`.
  - Cierre de sesión (`Logout`) y manejo de respuestas 401/403/409/422.

- **FASE C — DASHBOARD Y NAVEGACIÓN ADAPTATIVA**:
  - `NavGraph` dinámico por permisos RBAC.
  - `BottomNavigation` para teléfono / `NavigationRail` para Tablet.
  - Pantalla `DashboardScreen` consumiendo `GET /api/v1/reports/kpis` con tarjetas KPI Material 3, gráficos de rendimiento y estado del sistema.

- **FASE D — MÓDULO DE INVENTARIO**:
  - Catálogo de Productos (`ProductsScreen`, `ProductDetailScreen`, `CreateEditProductScreen`).
  - Almacenes (`WarehousesScreen`).
  - Existencias (`StockScreen`) con filtros por almacén/producto y badges de stock bajo.
  - Movimientos (`MovementsScreen` - inmutable de solo lectura).
  - Formularios de Entradas, Salidas, Ajustes y Transferencias.
  - Conteos Físicos (`CountsScreen`, `CreateCountScreen`, `PostCountScreen`) con soporte para lotes y números de serie.

- **FASE E — COMPRAS Y VENTAS**:
  - Proveedores y Clientes (`SuppliersScreen`, `CustomersScreen`).
  - Órdenes de Compra y Pedidos de Venta (`PurchaseOrdersScreen`, `SalesOrdersScreen`).
  - Flujo de estados: `DRAFT → APPROVED / REJECTED` con aprobación/rechazo en vivo.

- **FASE F — FINANZAS**:
  - Cuentas financieras (`AccountsScreen` - saldo solo lectura de servidor).
  - Ingresos y Gastos (`IncomesScreen`, `ExpensesScreen` - append-only con anulación `/void`).
  - Presupuestos (`BudgetsScreen`).

- **FASE G — REPORTES Y EXPORTACIÓN**:
  - Pantallas de reportes financieros, ventas, compras e inventario.
  - Exportación de CSV mediante Intent / FileProvider de Android.

- **FASE H — CRM, RRHH Y PRODUCCIÓN**:
  - CRM Leads (`LeadsScreen` con pipeline de estados).
  - RRHH Empleados (`EmployeesScreen`).
  - Producción: Listas BOM (`BomsScreen`) y Órdenes de Trabajo (`ProductionOrdersScreen` con estados `RELEASED`, `DONE`, `CANCELLED`).

- **FASE I — CONFIGURACIÓN, AUDITORÍA Y DATOS MAESTROS**:
  - Usuarios, Roles y Permisos (`UsersScreen`, `RolesScreen`).
  - Sucursales y Datos Maestros (`BranchesScreen`, `MasterDataScreen`).
  - Auditoría Inmutable (`AuditScreen` - solo lectura con visor JSON).

- **FASE J — CACHÉ OFFLINE, SEGURIDAD PROGUARD & QA**:
  - Persistencia de lectura offline con Room.
  - Reglas de ProGuard/R8 para release (`proguard-rules.pro`).
  - Tests unitarios de ViewModels, Mappers y `PermissionChecker`.

---

 Comienza ahora la ejecución de la **FASE A**.
