package com.diplomado.erp.feature.dashboard.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diplomado.erp.core.common.ActivityDescriber
import com.diplomado.erp.core.common.ActivityItem
import com.diplomado.erp.core.common.friendlyError
import com.diplomado.erp.core.common.rbac.PermissionChecker
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.ApiResponse
import com.diplomado.erp.core.network.dto.FinanceReportDto
import com.diplomado.erp.core.network.dto.InventoryReportDto
import com.diplomado.erp.core.network.dto.KpisDataDto
import com.diplomado.erp.core.network.dto.MonthTotalDto
import com.diplomado.erp.core.security.TokenStorage
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.Response
import java.io.IOException
import java.time.Instant
import java.time.LocalDate

/** Rangos del control segmentado (mismos que la web: 30, 7 y 365 días). */
enum class SalesRange(val label: String, val days: Long) {
    Mensual("Mensual", 30),
    Semanal("Semanal", 7),
    Anual("Anual", 365)
}

data class DashboardData(
    val kpis: KpisDataDto? = null,
    val salesSeries: List<MonthTotalDto> = emptyList(),
    val purchasesSeries: List<MonthTotalDto> = emptyList(),
    val inventory: InventoryReportDto? = null,
    val finance: FinanceReportDto? = null,
    val activity: List<ActivityItem> = emptyList(),
    val canSeeReports: Boolean = false,
    val canSeeActivity: Boolean = false
)

sealed class DashboardUiState {
    data object Loading : DashboardUiState()
    data class Success(
        val data: DashboardData,
        val range: SalesRange,
        val rangeLoading: Boolean = false
    ) : DashboardUiState()
    data class Error(val message: String) : DashboardUiState()
}

/**
 * Datos del Dashboard con los MISMOS endpoints que la web (HomeScreen.js):
 * /reports/kpis, /reports/sales, /reports/purchases, /reports/inventory,
 * /reports/finance y /audit (+ /users para mostrar nombres en la actividad).
 */
class DashboardViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<DashboardUiState>(DashboardUiState.Loading)
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    private var range = SalesRange.Mensual

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = DashboardUiState.Loading
            _uiState.value = try {
                DashboardUiState.Success(fetchAll(range), range)
            } catch (e: Exception) {
                DashboardUiState.Error(friendlyError(e, "No pudimos cargar el Dashboard."))
            }
        }
    }

    /** Cambia Mensual/Semanal/Anual sin ocultar el resto del Dashboard. */
    fun selectRange(newRange: SalesRange) {
        val current = _uiState.value as? DashboardUiState.Success ?: return
        if (newRange == range) return
        range = newRange
        viewModelScope.launch {
            _uiState.value = current.copy(range = newRange, rangeLoading = true)
            _uiState.value = try {
                val updated = fetchReports(newRange)
                DashboardUiState.Success(
                    current.data.copy(
                        kpis = updated.kpis,
                        salesSeries = updated.salesSeries,
                        purchasesSeries = updated.purchasesSeries,
                        finance = updated.finance
                    ),
                    newRange
                )
            } catch (e: Exception) {
                current.copy(range = newRange, rangeLoading = false)
            }
        }
    }

    private fun can(vararg permissions: String) = permissions.all { PermissionChecker.hasPermission(it) }

    /** Desempaqueta la respuesta; un 4xx/5xx de un reporte deja el dato vacío (estado vacío en la UI). */
    private fun <T> Response<ApiResponse<T>>.dataOrNull(): T? = if (isSuccessful) body()?.data else null

    /** Un reporte que falla no tumba el Dashboard; sólo un fallo de red generalizado lo hace. */
    private suspend fun <T> safe(block: suspend () -> T?): Result<T?> =
        try {
            Result.success(block())
        } catch (e: IOException) {
            Result.failure(e)
        }

    private suspend fun fetchReports(range: SalesRange): DashboardData = coroutineScope {
        // `to` como instante actual: con sólo la fecha el backend corta a medianoche UTC y omite hoy.
        val from = LocalDate.now().minusDays(range.days).toString()
        val to = Instant.now().toString()
        val api = RetrofitClient.api

        val kpis = async { safe { if (can("reports.read")) api.getKpis(from, to).dataOrNull() else null } }
        val sales = async {
            safe { if (can("reports.read", "sales.orders.read")) api.getSalesReport(from, to).dataOrNull() else null }
        }
        val purchases = async {
            safe { if (can("reports.read", "purchases.read")) api.getPurchasesReport(from, to).dataOrNull() else null }
        }
        val finance = async {
            safe { if (can("reports.read", "finance.accounts.read")) api.getFinanceReport(from, to).dataOrNull() else null }
        }

        val results = listOf(kpis.await(), sales.await(), purchases.await(), finance.await())
        if (results.isNotEmpty() && results.all { it.isFailure }) throw results.first().exceptionOrNull()!!

        DashboardData(
            kpis = kpis.await().getOrNull(),
            salesSeries = sales.await().getOrNull()?.byMonth.orEmpty(),
            purchasesSeries = purchases.await().getOrNull()?.byMonth.orEmpty(),
            finance = finance.await().getOrNull(),
            canSeeReports = can("reports.read")
        )
    }

    private suspend fun fetchAll(range: SalesRange): DashboardData = coroutineScope {
        val api = RetrofitClient.api
        val reports = async { fetchReports(range) }
        val inventory = async {
            safe { if (can("reports.read", "inventory.read")) api.getInventoryReport().dataOrNull() else null }
        }
        val audit = async {
            safe { if (can("audit.read")) api.getAuditLogs(limit = 100, result = "SUCCESS").dataOrNull() else null }
        }
        val users = async {
            safe { if (can("users.read")) api.getUsers(limit = 100).dataOrNull() else null }
        }

        val namesById = users.await().getOrNull().orEmpty().associate { user ->
            user.id to listOfNotNull(user.name, user.lastName).joinToString(" ").trim().ifEmpty { user.email }
        }
        val activity = ActivityDescriber.buildFeed(
            logs = audit.await().getOrNull().orEmpty(),
            namesById = namesById,
            currentEmail = TokenStorage.getUserEmail(),
            currentName = TokenStorage.getUserName()
        )

        reports.await().copy(
            inventory = inventory.await().getOrNull(),
            activity = activity,
            canSeeActivity = can("audit.read")
        )
    }
}
