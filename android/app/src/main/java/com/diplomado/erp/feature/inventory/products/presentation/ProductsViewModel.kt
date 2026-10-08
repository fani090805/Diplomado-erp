package com.diplomado.erp.feature.inventory.products.presentation

import com.diplomado.erp.core.network.errorMessage

import com.diplomado.erp.core.common.friendlyError
import com.diplomado.erp.core.network.live.refreshOnLive
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.ApiResponse
import com.diplomado.erp.core.network.dto.ProductDto
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.Response

sealed class ProductsUiState {
    data object Loading : ProductsUiState()
    data class Success(
        val products: List<ProductDto>,
        val total: Int,
        val activeCount: Int,
        val inactiveCount: Int
    ) : ProductsUiState()
    data class Error(val message: String) : ProductsUiState()
}

class ProductsViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<ProductsUiState>(ProductsUiState.Loading)
    val uiState: StateFlow<ProductsUiState> = _uiState.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _activeTab = MutableStateFlow("active")
    val activeTab: StateFlow<String> = _activeTab.asStateFlow()

    init {
        loadProducts()
        // Cambios en vivo (web, otros usuarios) o regreso a primer plano: recarga silenciosa.
        refreshOnLive("product", "inventory") { loadProducts(silent = true) }
    }

    fun onSearchChange(query: String) {
        _searchQuery.value = query
        loadProducts(query)
    }

    fun onTabChange(status: String) {
        if (status !in listOf("active", "inactive")) return
        _activeTab.value = status
        loadProducts(status = status)
    }

    fun loadProducts(
        search: String? = _searchQuery.value,
        silent: Boolean = false,
        status: String = _activeTab.value
    ) {
        viewModelScope.launch {
            if (!silent || _uiState.value !is ProductsUiState.Success) _uiState.value = ProductsUiState.Loading
            try {
                val searchParam = search?.takeIf(String::isNotEmpty)
                val response = RetrofitClient.api.getProducts(page = 1, limit = 50, search = searchParam, status = status)
                if (!response.isSuccessful || response.body()?.data == null) {
                    if (!silent || _uiState.value !is ProductsUiState.Success) {
                        _uiState.value = ProductsUiState.Error(response.errorMessage("Error al cargar productos."))
                    }
                    return@launch
                }

                val (activeCount, inactiveCount) = coroutineScope {
                    val active = async { RetrofitClient.api.getProducts(page = 1, limit = 1, status = "active") }
                    val inactive = async { RetrofitClient.api.getProducts(page = 1, limit = 1, status = "inactive") }
                    Pair(active.await().body()?.meta?.total ?: 0, inactive.await().body()?.meta?.total ?: 0)
                }
                _uiState.value = ProductsUiState.Success(
                    products = response.body()!!.data!!,
                    total = response.body()!!.meta?.total ?: 0,
                    activeCount = activeCount,
                    inactiveCount = inactiveCount
                )
            } catch (e: Exception) {
                if (!silent || _uiState.value !is ProductsUiState.Success) {
                    _uiState.value = ProductsUiState.Error(friendlyError(e, "Error de red."))
                }
            }
        }
    }

    fun deactivateProduct(id: String, onError: (String) -> Unit) = mutateProduct(onError) {
        RetrofitClient.api.deactivateProduct(id)
    }

    fun reactivateProduct(id: String, onError: (String) -> Unit) = mutateProduct(onError) {
        RetrofitClient.api.reactivateProduct(id)
    }

    fun deleteProduct(id: String, onError: (String) -> Unit) = mutateProduct(onError) {
        RetrofitClient.api.deleteProduct(id)
    }

    private fun <T> mutateProduct(onError: (String) -> Unit, request: suspend () -> Response<ApiResponse<T>>) {
        viewModelScope.launch {
            try {
                val response = request()
                if (response.isSuccessful) {
                    loadProducts(silent = true)
                } else {
                    onError(response.errorMessage("No se pudo actualizar el producto."))
                }
            } catch (e: Exception) {
                onError(friendlyError(e, "Error de conexión."))
            }
        }
    }

}
