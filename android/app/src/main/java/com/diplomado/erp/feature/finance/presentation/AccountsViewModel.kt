package com.diplomado.erp.feature.finance.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.AccountDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class AccountsUiState {
    data object Loading : AccountsUiState()
    data class Success(val accounts: List<AccountDto>) : AccountsUiState()
    data class Error(val message: String) : AccountsUiState()
}

class AccountsViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<AccountsUiState>(AccountsUiState.Loading)
    val uiState: StateFlow<AccountsUiState> = _uiState.asStateFlow()

    init {
        loadAccounts()
    }

    fun loadAccounts() {
        viewModelScope.launch {
            _uiState.value = AccountsUiState.Loading
            try {
                val res = RetrofitClient.api.getFinanceAccounts()
                if (res.isSuccessful && res.body()?.data != null) {
                    _uiState.value = AccountsUiState.Success(res.body()!!.data!!)
                } else {
                    _uiState.value = AccountsUiState.Error(res.body()?.error?.message ?: "Error al cargar cuentas financieras.")
                }
            } catch (e: Exception) {
                _uiState.value = AccountsUiState.Error(e.message ?: "Error de red.")
            }
        }
    }
}
