package com.diplomado.erp.feature.auth.presentation

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diplomado.erp.core.common.API_LOG_TAG
import com.diplomado.erp.core.common.isUnreadableResponse
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.LoginRequest
import com.diplomado.erp.core.security.TokenStorage
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Aviso del login: ámbar (cuenta/empresa en revisión) o rojo (el resto), como la web. */
data class AuthNotice(val message: String, val pending: Boolean = false)

data class LoginUiState(
    val loading: Boolean = false,
    /** Mensaje de conexión lenta / sin respuesta (texto gris bajo el botón). */
    val connectionMessage: String? = null,
    val notice: AuthNotice? = null,
    val success: Boolean = false
)

/** Códigos del backend (auth.service.js) que la web muestra en ámbar. */
private val PENDING_CODES = setOf("ACCOUNT_PENDING", "COMPANY_IN_REVIEW")

const val LOGIN_FALLBACK_MESSAGE = "Credenciales inválidas. Verifique sus datos."

class LoginViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(LoginUiState())
    val uiState: StateFlow<LoginUiState> = _uiState.asStateFlow()

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank() || _uiState.value.loading) return
        _uiState.value = LoginUiState(loading = true)

        viewModelScope.launch {
            val result = authRequest(onSlow = ::setSlow) {
                RetrofitClient.api.login(LoginRequest(email.trim(), password))
            }
            when (result) {
                is AuthResult.Ok -> {
                    val data = result.data
                    if (data == null) {
                        finish(notice = AuthNotice(LOGIN_FALLBACK_MESSAGE))
                        return@launch
                    }
                    TokenStorage.saveTokens(data.accessToken, data.refreshToken)
                    fetchMeAndSaveSession(data.user.email)
                    _uiState.value = LoginUiState(success = true)
                }
                is AuthResult.Rejected -> finish(notice = noticeFor(result))
                is AuthResult.TimedOut -> finish(connectionMessage = CONNECTION_TIMEOUT_MESSAGE)
                is AuthResult.Failed -> finish(notice = AuthNotice(result.message))
            }
        }
    }

    private fun setSlow(slow: Boolean) = _uiState.update {
        if (!it.loading) it else it.copy(connectionMessage = if (slow) CONNECTION_SLOW_MESSAGE else null)
    }

    private fun finish(notice: AuthNotice? = null, connectionMessage: String? = null) {
        _uiState.value = LoginUiState(notice = notice, connectionMessage = connectionMessage)
    }

    private suspend fun fetchMeAndSaveSession(emailFallback: String) {
        try {
            val meRes = RetrofitClient.api.getMe()
            val me = meRes.body()?.data
            if (meRes.isSuccessful && me != null) {
                TokenStorage.saveSessionInfo(
                    email = me.user.email,
                    name = listOfNotNull(me.user.name, me.user.lastName).joinToString(" ").trim(),
                    roleLabel = me.role?.label ?: me.role?.code ?: "Usuario",
                    permissions = me.role?.permissions ?: emptyList(),
                    companyName = me.company?.name ?: "FAI Solution ERP",
                    branchName = me.branch?.name ?: ""
                )
                return
            }
        } catch (e: Exception) {
            // Sin /auth/me la sesión queda sin permisos: que quede registrado si fue un DTO desactualizado.
            if (isUnreadableResponse(e)) Log.e(API_LOG_TAG, "No se pudo leer /auth/me: ${e.message}", e)
        }
        TokenStorage.saveSessionInfo(emailFallback, "Operador", "Usuario", emptyList(), "FAI Solution ERP", "")
    }
}

/** Aviso para un login rechazado: el mensaje del servidor tal cual; ámbar si está en revisión. */
fun noticeFor(result: AuthResult.Rejected): AuthNotice = AuthNotice(
    message = result.error.message?.takeIf { it.isNotBlank() } ?: LOGIN_FALLBACK_MESSAGE,
    pending = result.error.code in PENDING_CODES
)
