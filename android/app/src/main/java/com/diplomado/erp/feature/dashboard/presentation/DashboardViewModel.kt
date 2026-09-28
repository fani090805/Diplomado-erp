package com.diplomado.erp.feature.dashboard.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diplomado.erp.core.common.rbac.PermissionChecker
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.AuditLogDto
import com.diplomado.erp.core.network.dto.KpisDataDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class DashboardUiState {
    data object Loading : DashboardUiState()
    data class Success(val kpis: KpisDataDto?, val auditLogs: List<AuditLogDto>) : DashboardUiState()
    data class Error(val message: String) : DashboardUiState()
}

class DashboardViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<DashboardUiState>(DashboardUiState.Loading)
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = DashboardUiState.Loading
            try {
                var kpisData: KpisDataDto? = null
                var logs: List<AuditLogDto> = emptyList()

                if (PermissionChecker.hasPermission("reports.read")) {
                    val res = RetrofitClient.api.getKpis()
                    if (res.isSuccessful) {
                        kpisData = res.body()?.data
                    }
                }

                if (PermissionChecker.hasPermission("audit.read")) {
                    val auditRes = RetrofitClient.api.getAuditLogs(5)
                    if (auditRes.isSuccessful) {
                        logs = auditRes.body()?.data ?: emptyList()
                    }
                }

                _uiState.value = DashboardUiState.Success(kpisData, logs)
            } catch (e: Exception) {
                _uiState.value = DashboardUiState.Error(e.message ?: "Error al cargar datos del Dashboard.")
            }
        }
    }
}
