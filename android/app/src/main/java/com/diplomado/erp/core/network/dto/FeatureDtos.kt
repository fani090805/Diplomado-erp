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
    @SerializedName("status") val status: String = "active",
    @SerializedName("description") val description: String? = null
)

// Almacenes
data class WarehouseDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("name") val name: String,
    @SerializedName("isDefault") val isDefault: Boolean = false,
    @SerializedName("status") val status: String = "active"
)

// Stock Level
data class StockLevelDto(
    @SerializedName("_id") val id: String,
    @SerializedName("productId") val product: ProductDto? = null,
    @SerializedName("warehouseId") val warehouse: WarehouseDto? = null,
    @SerializedName("quantity") val quantity: Double = 0.0
)

// Movimientos de Inventario
data class MovementDto(
    @SerializedName("_id") val id: String,
    @SerializedName("type") val type: String, // ENTRY, EXIT, ADJUSTMENT, TRANSFER
    @SerializedName("productId") val product: ProductDto? = null,
    @SerializedName("warehouseId") val warehouse: WarehouseDto? = null,
    @SerializedName("quantity") val quantity: Double = 0.0,
    @SerializedName("reason") val reason: String? = null,
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
    @SerializedName("productId") val productId: Any? = null,
    @SerializedName("quantity") val quantity: Double = 0.0,
    @SerializedName("unitCost") val unitCost: Double? = 0.0,
    @SerializedName("unitPrice") val unitPrice: Double? = 0.0
)

data class PurchaseOrderDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("supplierId") val supplier: SupplierDto? = null,
    @SerializedName("total") val total: Double = 0.0,
    @SerializedName("status") val status: String = "DRAFT", // DRAFT, APPROVED, REJECTED
    @SerializedName("lines") val lines: List<OrderLineDto> = emptyList(),
    @SerializedName("createdAt") val createdAt: String? = null
)

data class SalesOrderDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("customerId") val customer: CustomerDto? = null,
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
data class BomDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("productId") val product: ProductDto? = null,
    @SerializedName("status") val status: String = "active"
)

data class ProductionOrderDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("quantity") val quantity: Double = 1.0,
    @SerializedName("status") val status: String = "DRAFT", // DRAFT, RELEASED, DONE, CANCELLED
    @SerializedName("createdAt") val createdAt: String? = null
)

// Auditoría
data class AuditLogDto(
    @SerializedName("_id") val id: String,
    @SerializedName("action") val action: String,
    @SerializedName("entity") val entity: String,
    @SerializedName("user") val user: UserDto? = null,
    @SerializedName("createdAt") val createdAt: String? = null
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
    @SerializedName("lowStock") val lowStock: Int = 0,
    @SerializedName("totalProducts") val totalProducts: Int = 0
)
