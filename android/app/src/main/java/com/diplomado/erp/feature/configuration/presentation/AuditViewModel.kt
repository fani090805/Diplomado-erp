package com.diplomado.erp.feature.configuration.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.AuditLogDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class AuditUiState {
    data object Loading : AuditUiState()
    data class Success(val logs: List<AuditLogDto>) : AuditUiState()
    data class Error(val message: String) : AuditUiState()
}

class AuditViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<AuditUiState>(AuditUiState.Loading)
    val uiState: StateFlow<AuditUiState> = _uiState.asStateFlow()

    init {
        loadAuditLogs()
    }

    fun loadAuditLogs() {
        viewModelScope.launch {
            _uiState.value = AuditUiState.Loading
            try {
                val res = RetrofitClient.api.getAuditLogs(30)
                if (res.isSuccessful && res.body()?.data != null) {
                    _uiState.value = AuditUiState.Success(res.body()!!.data!!)
                } else {
                    _uiState.value = AuditUiState.Error(res.body()?.error?.message ?: "Error al cargar registros de auditoría.")
                }
            } catch (e: Exception) {
                _uiState.value = AuditUiState.Error(e.message ?: "Error de red.")
            }
        }
    }
}
