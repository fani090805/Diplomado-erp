package com.diplomado.erp.feature.inventory.stock.presentation

import com.diplomado.erp.core.common.friendlyError
import com.diplomado.erp.core.network.live.refreshOnLive

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.StockLevelDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class StockUiState {
    data object Loading : StockUiState()
    data class Success(val stockLevels: List<StockLevelDto>) : StockUiState()
    data class Error(val message: String) : StockUiState()
}

class StockViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<StockUiState>(StockUiState.Loading)
    val uiState: StateFlow<StockUiState> = _uiState.asStateFlow()

    // Últimos filtros: el refresco en vivo respeta lo que el usuario eligió.
    private var lastWarehouseId: String? = null
    private var lastProductId: String? = null

    init {
        loadStock()
        // Cambios en vivo (web, otros usuarios) o regreso a primer plano: recarga silenciosa.
        refreshOnLive("inventory", "product") { loadStock(lastWarehouseId, lastProductId, silent = true) }
    }

    fun loadStock(warehouseId: String? = null, productId: String? = null, silent: Boolean = false) {
        lastWarehouseId = warehouseId
        lastProductId = productId
        viewModelScope.launch {
            if (!silent || _uiState.value !is StockUiState.Success) _uiState.value = StockUiState.Loading
            try {
                val res = RetrofitClient.api.getStock(warehouseId, productId)
                if (res.isSuccessful && res.body()?.data != null) {
                    _uiState.value = StockUiState.Success(res.body()!!.data!!)
                } else {
                    if (!silent || _uiState.value !is StockUiState.Success) _uiState.value = StockUiState.Error(res.body()?.error?.message ?: "Error al cargar existencias.")
                }
            } catch (e: Exception) {
                if (!silent || _uiState.value !is StockUiState.Success) _uiState.value = StockUiState.Error(friendlyError(e, "Error de conexión."))
            }
        }
    }
}
