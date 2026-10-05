package com.diplomado.erp.feature.auth.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.LoginRequest
import com.diplomado.erp.core.security.TokenStorage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class LoginUiState {
    data object Idle : LoginUiState()
    data object Loading : LoginUiState()
    data object Success : LoginUiState()
    data class Error(val message: String) : LoginUiState()
}

class LoginViewModel : ViewModel() {

    private val _uiState = MutableStateFlow<LoginUiState>(LoginUiState.Idle)
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _uiState.value = LoginUiState.Error("Ingrese correo y contraseña.")
            return
        }

        viewModelScope.launch {
            _uiState.value = LoginUiState.Loading
            try {
                val response = RetrofitClient.api.login(LoginRequest(email.trim(), password))
                if (response.isSuccessful && response.body()?.success == true) {
                    val loginData = response.body()?.data
                    if (loginData != null) {
                        // Guardar Tokens
                        TokenStorage.saveTokens(loginData.accessToken, loginData.refreshToken)

                        // Traer metadatos de usuario / permisos con /auth/me
                        fetchMeAndSaveSession(loginData.user.email)
                    } else {
                        _uiState.value = LoginUiState.Error("Respuesta inválida del servidor.")
                    }
                } else {
                    val errorMsg = response.body()?.error?.message 
                        ?: "Credenciales inválidas. Verifique sus datos."
                    _uiState.value = LoginUiState.Error(errorMsg)
                }
            } catch (e: Exception) {
                _uiState.value = LoginUiState.Error(e.message ?: "Error de conexión con el servidor.")
            }
        }
    }

    private suspend fun fetchMeAndSaveSession(emailFallback: String) {
        try {
            val meRes = RetrofitClient.api.getMe()
            if (meRes.isSuccessful && meRes.body()?.data != null) {
                val me = meRes.body()!!.data!!
                TokenStorage.saveSessionInfo(
                    email = me.user.email,
                    name = me.user.name,
                    roleLabel = me.role?.label ?: me.role?.code ?: "Usuario",
                    permissions = me.role?.permissions ?: emptyList(),
                    companyName = me.company?.name ?: "FAI Solution ERP",
                    branchName = me.branch?.name ?: ""
                )
            } else {
                TokenStorage.saveSessionInfo(emailFallback, "Operador", "Usuario", emptyList(), "FAI Solution ERP", "")
            }
            _uiState.value = LoginUiState.Success
        } catch (e: Exception) {
            TokenStorage.saveSessionInfo(emailFallback, "Operador", "Usuario", emptyList(), "FAI Solution ERP", "")
            _uiState.value = LoginUiState.Success
        }
    }
}
