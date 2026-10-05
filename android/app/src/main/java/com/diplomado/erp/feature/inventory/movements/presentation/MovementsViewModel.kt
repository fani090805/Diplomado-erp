package com.diplomado.erp.feature.inventory.movements.presentation

import com.diplomado.erp.core.common.friendlyError

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.MovementDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class MovementsUiState {
    data object Loading : MovementsUiState()
    data class Success(val movements: List<MovementDto>, val total: Int) : MovementsUiState()
    data class Error(val message: String) : MovementsUiState()
}

class MovementsViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<MovementsUiState>(MovementsUiState.Loading)
    val uiState: StateFlow<MovementsUiState> = _uiState.asStateFlow()

    init {
        loadMovements()
    }

    fun loadMovements(type: String? = null) {
        viewModelScope.launch {
            _uiState.value = MovementsUiState.Loading
            try {
                val res = RetrofitClient.api.getMovements(type = type, page = 1, limit = 50)
                if (res.isSuccessful && res.body()?.data != null) {
                    val list = res.body()!!.data!!
                    val total = res.body()!!.meta?.total ?: list.size
                    _uiState.value = MovementsUiState.Success(list, total)
                } else {
                    _uiState.value = MovementsUiState.Error(res.body()?.error?.message ?: "Error al cargar movimientos.")
                }
            } catch (e: Exception) {
                _uiState.value = MovementsUiState.Error(friendlyError(e, "Error de red."))
            }
        }
    }
}
