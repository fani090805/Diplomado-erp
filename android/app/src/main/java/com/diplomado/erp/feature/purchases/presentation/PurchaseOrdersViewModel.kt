package com.diplomado.erp.feature.purchases.presentation

import com.diplomado.erp.core.common.friendlyError
import com.diplomado.erp.core.network.live.refreshOnLive

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.PurchaseOrderDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class PurchaseOrdersUiState {
    data object Loading : PurchaseOrdersUiState()
    data class Success(val orders: List<PurchaseOrderDto>) : PurchaseOrdersUiState()
    data class Error(val message: String) : PurchaseOrdersUiState()
}

class PurchaseOrdersViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<PurchaseOrdersUiState>(PurchaseOrdersUiState.Loading)
    val uiState: StateFlow<PurchaseOrdersUiState> = _uiState.asStateFlow()

    // Últimos filtros: el refresco en vivo respeta lo que el usuario eligió.
    private var lastStatus: String? = null

    init {
        loadOrders()
        // Cambios en vivo (web, otros usuarios) o regreso a primer plano: recarga silenciosa.
        refreshOnLive("purchase-order", "supplier") { loadOrders(lastStatus, silent = true) }
    }

    fun loadOrders(status: String? = null, silent: Boolean = false) {
        lastStatus = status
        viewModelScope.launch {
            if (!silent || _uiState.value !is PurchaseOrdersUiState.Success) _uiState.value = PurchaseOrdersUiState.Loading
            try {
                val res = RetrofitClient.api.getPurchaseOrders(status = status)
                if (res.isSuccessful && res.body()?.data != null) {
                    _uiState.value = PurchaseOrdersUiState.Success(res.body()!!.data!!)
                } else {
                    if (!silent || _uiState.value !is PurchaseOrdersUiState.Success) _uiState.value = PurchaseOrdersUiState.Error(res.body()?.error?.message ?: "Error al cargar órdenes de compra.")
                }
            } catch (e: Exception) {
                if (!silent || _uiState.value !is PurchaseOrdersUiState.Success) _uiState.value = PurchaseOrdersUiState.Error(friendlyError(e, "Error de red."))
            }
        }
    }

    fun approveOrder(id: String) {
        viewModelScope.launch {
            try {
                val res = RetrofitClient.api.approvePurchaseOrder(id)
                if (res.isSuccessful) {
                    loadOrders()
                } else {
                    _uiState.value = PurchaseOrdersUiState.Error(res.body()?.error?.message ?: "No se pudo aprobar la orden.")
                }
            } catch (e: Exception) {
                _uiState.value = PurchaseOrdersUiState.Error(friendlyError(e, "Error de conexión."))
            }
        }
    }

    fun rejectOrder(id: String, reason: String) {
        viewModelScope.launch {
            try {
                val res = RetrofitClient.api.rejectPurchaseOrder(id, mapOf("reason" to reason))
                if (res.isSuccessful) {
                    loadOrders()
                } else {
                    _uiState.value = PurchaseOrdersUiState.Error(res.body()?.error?.message ?: "No se pudo rechazar la orden.")
                }
            } catch (e: Exception) {
                _uiState.value = PurchaseOrdersUiState.Error(friendlyError(e, "Error de conexión."))
            }
        }
    }
}
