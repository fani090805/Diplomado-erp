package com.diplomado.erp.contracts

import com.diplomado.erp.core.network.dto.AccountDto
import com.diplomado.erp.core.network.dto.ApiResponse
import com.diplomado.erp.core.network.dto.AppMetaDto
import com.diplomado.erp.core.network.dto.AuditLogDto
import com.diplomado.erp.core.network.dto.BomDto
import com.diplomado.erp.core.network.dto.CostCenterDto
import com.diplomado.erp.core.network.dto.CustomerDto
import com.diplomado.erp.core.network.dto.EmployeeDto
import com.diplomado.erp.core.network.dto.EventTicketDto
import com.diplomado.erp.core.network.dto.ExpenseDto
import com.diplomado.erp.core.network.dto.FinanceReportDto
import com.diplomado.erp.core.network.dto.IncomeDto
import com.diplomado.erp.core.network.dto.InventoryReportDto
import com.diplomado.erp.core.network.dto.KpisDataDto
import com.diplomado.erp.core.network.dto.LeadDto
import com.diplomado.erp.core.network.dto.LoginResponse
import com.diplomado.erp.core.network.dto.MeResponse
import com.diplomado.erp.core.network.dto.MovementDto
import com.diplomado.erp.core.network.dto.ProductDto
import com.diplomado.erp.core.network.dto.ProductionOrderDto
import com.diplomado.erp.core.network.dto.ProjectDto
import com.diplomado.erp.core.network.dto.PurchaseOrderDto
import com.diplomado.erp.core.network.dto.RoleDto
import com.diplomado.erp.core.network.dto.SalesOrderDto
import com.diplomado.erp.core.network.dto.SeriesReportDto
import com.diplomado.erp.core.network.dto.StockLevelDto
import com.diplomado.erp.core.network.dto.SupplierDto
import com.diplomado.erp.core.network.dto.UserDto
import com.diplomado.erp.core.network.dto.WarehouseDto
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test
import java.io.File
import java.lang.reflect.Type
import kotlin.reflect.full.memberProperties

/**
 * Contratos API ↔ Android: cada DTO debe poder leer el JSON REAL que devuelve hoy
 * el backend (fixtures generados por backend/tests/contracts y copiados con
 * `node scripts/sync-contract-fixtures.js`).
 *
 * Se usa el mismo Gson que Retrofit (GsonConverterFactory.create() = Gson()).
 * Además de que no lance JsonSyntaxException, se revisa que ningún campo declarado
 * NO nulo en Kotlin haya quedado en null: Gson no respeta la nulabilidad ni los
 * valores por defecto de Kotlin, y eso truena después en la pantalla.
 */
class ApiContractsTest {

    private val gson = Gson()

    private fun listOf(type: Class<*>): Type = TypeToken.getParameterized(List::class.java, type).type

    /** Fixture → tipo de `data` en ApiResponse, igual que en ErpApi. */
    private val contracts: Map<String, Type> = mapOf(
        "auth-login" to LoginResponse::class.java,
        "auth-me" to MeResponse::class.java,
        "meta" to AppMetaDto::class.java,
        "events-ticket" to EventTicketDto::class.java,
        "sales-orders" to listOf(SalesOrderDto::class.java),
        "purchase-orders" to listOf(PurchaseOrderDto::class.java),
        "products" to listOf(ProductDto::class.java),
        "inventory-stock" to listOf(StockLevelDto::class.java),
        "inventory-movements" to listOf(MovementDto::class.java),
        "warehouses" to listOf(WarehouseDto::class.java),
        "customers" to listOf(CustomerDto::class.java),
        "suppliers" to listOf(SupplierDto::class.java),
        "reports-kpis" to KpisDataDto::class.java,
        "reports-sales" to SeriesReportDto::class.java,
        "reports-sales-by-day" to SeriesReportDto::class.java,
        "reports-purchases" to SeriesReportDto::class.java,
        "reports-inventory" to InventoryReportDto::class.java,
        "reports-finance" to FinanceReportDto::class.java,
        "users" to listOf(UserDto::class.java),
        "roles" to listOf(RoleDto::class.java),
        "audit" to listOf(AuditLogDto::class.java),
        "finance-accounts" to listOf(AccountDto::class.java),
        "finance-incomes" to listOf(IncomeDto::class.java),
        "finance-expenses" to listOf(ExpenseDto::class.java),
        "crm-leads" to listOf(LeadDto::class.java),
        "hr-employees" to listOf(EmployeeDto::class.java),
        "production-boms" to listOf(BomDto::class.java),
        "production-orders" to listOf(ProductionOrderDto::class.java),
        "projects" to listOf(ProjectDto::class.java),
        "cost-centers" to listOf(CostCenterDto::class.java)
    )

    private fun fixtureDir(): File {
        val url = javaClass.classLoader?.getResource("contracts")
            ?: error("Faltan los fixtures: corre `node scripts/sync-contract-fixtures.js` desde la raíz.")
        return File(url.toURI())
    }

    private fun read(name: String): String = File(fixtureDir(), "$name.json").readText(Charsets.UTF_8)

    private fun <T> parse(name: String): ApiResponse<T> {
        val type = TypeToken.getParameterized(ApiResponse::class.java, contracts.getValue(name)).type
        return gson.fromJson(read(name), type)
    }

    /** Rutas de campos no nulos en Kotlin que llegaron en null (recorre DTOs, listas y mapas). */
    private fun nullViolations(value: Any?, path: String): List<String> = when {
        value == null -> emptyList()
        value is Iterable<*> -> value.flatMapIndexed { i, item -> nullViolations(item, "$path[$i]") }
        value is Map<*, *> -> value.entries.flatMap { (k, v) -> nullViolations(v, "$path.$k") }
        value.javaClass.name.startsWith("com.diplomado.erp.") -> value::class.memberProperties.flatMap { prop ->
            val field = prop.getter.call(value)
            if (field == null && !prop.returnType.isMarkedNullable) listOf("$path.${prop.name}")
            else nullViolations(field, "$path.${prop.name}")
        }
        else -> emptyList()
    }

    @Test
    fun `cada fixture del backend tiene su DTO y viceversa`() {
        val fixtures = fixtureDir().listFiles { f -> f.extension == "json" }.orEmpty().map { it.nameWithoutExtension }.toSet()
        assertEquals("Fixtures sin DTO en esta prueba", emptySet<String>(), fixtures - contracts.keys)
        assertEquals("DTOs sin fixture (¿falta sincronizar?)", emptySet<String>(), contracts.keys - fixtures)
    }

    @Test
    fun `todos los DTO leen la respuesta real sin errores ni nulos ocultos`() {
        val failures = contracts.keys.sorted().mapNotNull { name ->
            try {
                val response = parse<Any>(name)
                val problems = buildList {
                    if (!response.success) add("success=false")
                    if (response.data == null) add("data=null")
                    addAll(nullViolations(response, "$"))
                }
                if (problems.isEmpty()) null else "$name: ${problems.joinToString()}"
            } catch (e: Exception) {
                "$name: ${e.javaClass.simpleName}: ${e.message}"
            }
        }
        if (failures.isNotEmpty()) fail("Contratos rotos:\n  " + failures.joinToString("\n  "))
    }

    @Test
    fun `ventas y compras traen el id como texto y el nombre ya resuelto`() {
        val sale = parse<List<SalesOrderDto>>("sales-orders").data!!.first()
        assertTrue(sale.customerId!!.isNotBlank())
        assertEquals("Comercial Central", sale.customerName)

        val purchase = parse<List<PurchaseOrderDto>>("purchase-orders").data!!.first()
        assertTrue(purchase.supplierId!!.isNotBlank())
        assertEquals("Distribuidora Norte", purchase.supplierName)
    }

    @Test
    fun `existencias y movimientos traen el producto resumido aparte del id`() {
        val stock = parse<List<StockLevelDto>>("inventory-stock").data!!.first()
        assertTrue(stock.productId!!.isNotBlank())
        assertEquals("Tornillo", stock.product?.name)
        assertEquals("Almacén General", stock.warehouse?.name)

        val movement = parse<List<MovementDto>>("inventory-movements").data!!.first()
        assertEquals("Tornillo", movement.product?.name)
    }

    @Test
    fun `reportes de ventas traen series agrupadas y la paginacion de listas se lee`() {
        val byDay = parse<SeriesReportDto>("reports-sales-by-day").data!!
        assertEquals("day", byDay.groupBy)
        assertTrue(byDay.series.orEmpty().isNotEmpty())
        assertTrue(byDay.series!!.first().period!!.matches(Regex("""\d{4}-\d{2}-\d{2}""")))

        val meta = parse<List<SalesOrderDto>>("sales-orders").meta!!
        assertEquals(1, meta.page)
        assertTrue(meta.total >= 1)
    }
}
