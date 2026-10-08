package com.diplomado.erp.core.network.dto

import com.google.gson.annotations.SerializedName

// Productos
data class ProductDto(
    @SerializedName("_id") val id: String,
    @SerializedName("sku") val sku: String,
    @SerializedName("name") val name: String,
    @SerializedName("category") val category: String? = null,
    @SerializedName("unit") val unit: String? = null,
    @SerializedName("costPrice") val costPrice: Double? = 0.0,
    @SerializedName("salePrice") val salePrice: Double? = 0.0,
    @SerializedName("minStock") val minStock: Double? = 0.0,
    @SerializedName("maxStock") val maxStock: Double? = 0.0,
    @SerializedName("trackingMode") val trackingMode: String? = "none",
    @SerializedName("status") val status: String = "active",
    @SerializedName("description") val description: String? = null,
    @SerializedName("hasHistory") val hasHistory: Boolean = false
)

data class ProductDeleteDto(
    @SerializedName("_id") val id: String,
    @SerializedName("deleted") val deleted: Boolean
)

// Almacenes
data class WarehouseDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("isDefault") val isDefault: Boolean = false,
    @SerializedName("status") val status: String = "active"
)

// Resumen de producto / almacén que el backend adjunta a existencias y movimientos.
data class ProductRefDto(
    @SerializedName("sku") val sku: String? = null,
    @SerializedName("name") val name: String? = null,
    @SerializedName("unit") val unit: String? = null
)

data class WarehouseRefDto(
    @SerializedName("code") val code: String? = null,
    @SerializedName("name") val name: String? = null
)

// Stock Level (GET /inventory/stock): ids como texto + `product` / `warehouse` resumidos.
data class StockLevelDto(
    @SerializedName("_id") val id: String,
    @SerializedName("productId") val productId: String? = null,
    @SerializedName("warehouseId") val warehouseId: String? = null,
    @SerializedName("quantity") val quantity: Double = 0.0,
    @SerializedName("product") val product: ProductRefDto? = null,
    @SerializedName("warehouse") val warehouse: WarehouseRefDto? = null
)

// Movimientos de Inventario (GET /inventory/movements)
data class MovementDto(
    @SerializedName("_id") val id: String,
    @SerializedName("type") val type: String, // ENTRY, EXIT, ADJUSTMENT, TRANSFER
    @SerializedName("productId") val productId: String? = null,
    @SerializedName("warehouseId") val warehouseId: String? = null,
    @SerializedName("toWarehouseId") val toWarehouseId: String? = null,
    @SerializedName("quantity") val quantity: Double = 0.0,
    @SerializedName("delta") val delta: Double? = null,
    @SerializedName("reason") val reason: String? = null,
    @SerializedName("reference") val reference: String? = null,
    @SerializedName("product") val product: ProductRefDto? = null,
    @SerializedName("warehouse") val warehouse: WarehouseRefDto? = null,
    @SerializedName("toWarehouse") val toWarehouse: WarehouseRefDto? = null,
    @SerializedName("createdAt") val createdAt: String? = null
)

// Proveedores
data class SupplierDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String? = null,
    @SerializedName("status") val status: String = "active"
)

// Clientes
data class CustomerDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("email") val email: String? = null,
    @SerializedName("status") val status: String = "active"
)

// Órdenes de Compra / Venta
data class OrderLineDto(
    @SerializedName("productId") val productId: String? = null,
    @SerializedName("quantity") val quantity: Double = 0.0,
    @SerializedName("unitCost") val unitCost: Double? = 0.0,
    @SerializedName("unitPrice") val unitPrice: Double? = 0.0
)

/** GET /purchase-orders: `supplierId` es texto y el nombre ya viene resuelto en `supplierName`. */
data class PurchaseOrderDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("supplierId") val supplierId: String? = null,
    @SerializedName("supplierName") val supplierName: String? = null,
    @SerializedName("total") val total: Double = 0.0,
    @SerializedName("status") val status: String = "DRAFT", // DRAFT, APPROVED, REJECTED
    @SerializedName("lines") val lines: List<OrderLineDto> = emptyList(),
    @SerializedName("createdAt") val createdAt: String? = null
)

/** GET /sales-orders: `customerId` es texto y el nombre ya viene resuelto en `customerName`. */
data class SalesOrderDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("customerId") val customerId: String? = null,
    @SerializedName("customerName") val customerName: String? = null,
    @SerializedName("total") val total: Double = 0.0,
    @SerializedName("status") val status: String = "DRAFT",
    @SerializedName("lines") val lines: List<OrderLineDto> = emptyList(),
    @SerializedName("createdAt") val createdAt: String? = null
)

// Finanzas
data class AccountDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("type") val type: String = "cash",
    @SerializedName("currency") val currency: String = "MXN",
    @SerializedName("balance") val balance: Double = 0.0,
    @SerializedName("status") val status: String = "active"
)

data class IncomeDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("amount") val amount: Double = 0.0,
    @SerializedName("category") val category: String? = null,
    @SerializedName("status") val status: String = "POSTED",
    @SerializedName("createdAt") val createdAt: String? = null
)

data class ExpenseDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("amount") val amount: Double = 0.0,
    @SerializedName("category") val category: String? = null,
    @SerializedName("status") val status: String = "POSTED",
    @SerializedName("createdAt") val createdAt: String? = null
)

data class BudgetDto(
    @SerializedName("_id") val id: String,
    @SerializedName("year") val year: Int,
    @SerializedName("month") val month: Int? = null,
    @SerializedName("category") val category: String,
    @SerializedName("amount") val amount: Double = 0.0
)

// CRM & RRHH
data class LeadDto(
    @SerializedName("_id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("company") val company: String? = null,
    @SerializedName("email") val email: String? = null,
    @SerializedName("status") val status: String = "NEW", // NEW, CONTACTED, QUALIFIED, WON, LOST
    @SerializedName("expectedAmount") val expectedAmount: Double? = 0.0
)

data class EmployeeDto(
    @SerializedName("_id") val id: String,
    @SerializedName("documentId") val documentId: String,
    @SerializedName("firstName") val firstName: String,
    @SerializedName("lastName") val lastName: String,
    @SerializedName("position") val position: String? = null,
    @SerializedName("department") val department: String? = null,
    @SerializedName("status") val status: String = "active"
)

// Producción
data class BomComponentDto(
    @SerializedName("productId") val productId: String? = null,
    @SerializedName("quantity") val quantity: Double = 0.0
)

/** GET /production/boms: `productId` es texto (sin poblar). */
data class BomDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("productId") val productId: String? = null,
    @SerializedName("components") val components: List<BomComponentDto> = emptyList(),
    @SerializedName("status") val status: String = "active"
)

data class ProductionOrderDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("bomId") val bomId: String? = null,
    @SerializedName("productId") val productId: String? = null,
    @SerializedName("quantity") val quantity: Double = 1.0,
    @SerializedName("status") val status: String = "DRAFT", // DRAFT, RELEASED, DONE, CANCELLED
    @SerializedName("createdAt") val createdAt: String? = null
)

// Auditoría
/** Espejo de backend/src/modules/audit/audit.model.js (GET /audit). */
data class AuditLogDto(
    @SerializedName("_id") val id: String,
    @SerializedName("module") val module: String? = null,
    @SerializedName("action") val action: String? = null,
    @SerializedName("resourceType") val resourceType: String? = null,
    @SerializedName("resourceId") val resourceId: String? = null,
    @SerializedName("userId") val userId: String? = null,
    @SerializedName("userEmail") val userEmail: String? = null,
    @SerializedName("result") val result: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null
)

// Obras / Proyectos
data class ProjectDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("description") val description: String? = "",
    @SerializedName("location") val location: String? = "",
    @SerializedName("budget") val budget: Double = 0.0,
    @SerializedName("executedAmount") val executedAmount: Double = 0.0,
    @SerializedName("status") val status: String = "PLANEADA",
    @SerializedName("managerName") val managerName: String? = "",
    @SerializedName("startDate") val startDate: String? = null,
    @SerializedName("estimatedEndDate") val estimatedEndDate: String? = null
)

data class CostCenterDto(
    @SerializedName("_id") val id: String,
    @SerializedName("projectId") val projectId: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("category") val category: String = "MATERIALES",
    @SerializedName("budget") val budget: Double = 0.0,
    @SerializedName("executedAmount") val executedAmount: Double = 0.0,
    @SerializedName("status") val status: String = "active"
)

// KPIs Response
data class KpisDataDto(
    @SerializedName("sales") val sales: CountTotalDto? = null,
    @SerializedName("purchases") val purchases: CountTotalDto? = null,
    @SerializedName("income") val income: CountTotalDto? = null,
    @SerializedName("expense") val expense: CountTotalDto? = null,
    @SerializedName("net") val net: Double? = 0.0,
    @SerializedName("catalog") val catalog: CatalogKpisDto? = null
)

data class CountTotalDto(
    @SerializedName("count") val count: Int = 0,
    @SerializedName("total") val total: Double = 0.0
)

data class CatalogKpisDto(
    @SerializedName("products") val products: Int = 0,
    @SerializedName("customers") val customers: Int = 0,
    @SerializedName("suppliers") val suppliers: Int = 0,
    @SerializedName("lowStock") val lowStock: Int = 0
)

// Reportes (GET /reports/sales|purchases|inventory|finance), igual que la web.
data class MonthTotalDto(
    @SerializedName("month") val month: String? = null,
    @SerializedName("count") val count: Int = 0,
    @SerializedName("total") val total: Double = 0.0
)

data class StatusTotalDto(
    @SerializedName("status") val status: String? = null,
    @SerializedName("count") val count: Int = 0,
    @SerializedName("total") val total: Double = 0.0
)

/** Punto de `series`: `period` es "2026-10" (month), "2026-W41" (week) o "2026-10-08" (day). */
data class SeriesPointDto(
    @SerializedName("period") val period: String? = null,
    @SerializedName("start") val start: String? = null,
    @SerializedName("count") val count: Int = 0,
    @SerializedName("total") val total: Double = 0.0
)

data class SeriesReportDto(
    @SerializedName("byStatus") val byStatus: List<StatusTotalDto>? = null,
    @SerializedName("byMonth") val byMonth: List<MonthTotalDto>? = null,
    @SerializedName("groupBy") val groupBy: String? = null,
    @SerializedName("series") val series: List<SeriesPointDto>? = null
)

data class InventoryReportDto(
    @SerializedName("totalValue") val totalValue: Double? = null,
    @SerializedName("totalQuantity") val totalQuantity: Double? = null,
    @SerializedName("lowStock") val lowStock: Int? = null
)

data class FinanceReportDto(
    @SerializedName("income") val income: CountTotalDto? = null,
    @SerializedName("expense") val expense: CountTotalDto? = null,
    @SerializedName("net") val net: Double? = null
)
