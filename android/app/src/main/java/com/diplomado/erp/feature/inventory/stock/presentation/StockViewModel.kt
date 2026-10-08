package com.diplomado.erp.feature.inventory.stock.presentation

import com.diplomado.erp.core.common.friendlyError
import com.diplomado.erp.core.network.live.refreshOnLive

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.StockLevelDto
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class StockUiState {
    data object Loading : StockUiState()
    /** `minStockByProduct`: /inventory/stock no trae el mínimo; sale de /products (igual que la web). */
    data class Success(
        val stockLevels: List<StockLevelDto>,
        val minStockByProduct: Map<String, Double> = emptyMap()
    ) : StockUiState()
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
                val (res, minStock) = coroutineScope {
                    val stock = async { RetrofitClient.api.getStock(warehouseId, productId) }
                    // Sin /products (permiso o red) sólo se pierde el aviso de stock bajo.
                    val products = async { runCatching { RetrofitClient.api.getProducts(page = 1, limit = 100) }.getOrNull() }
                    stock.await() to products.await()?.body()?.data.orEmpty()
                        .mapNotNull { p -> p.minStock?.let { p.id to it } }
                        .toMap()
                }
                if (res.isSuccessful && res.body()?.data != null) {
                    _uiState.value = StockUiState.Success(res.body()!!.data!!, minStock)
                } else {
                    if (!silent || _uiState.value !is StockUiState.Success) _uiState.value = StockUiState.Error(res.body()?.error?.message ?: "Error al cargar existencias.")
                }
            } catch (e: Exception) {
                if (!silent || _uiState.value !is StockUiState.Success) _uiState.value = StockUiState.Error(friendlyError(e, "No pudimos cargar las existencias."))
            }
        }
    }
}
