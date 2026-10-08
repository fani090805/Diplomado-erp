package com.diplomado.erp.feature.auth.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.feature.auth.domain.CompanyForm
import com.diplomado.erp.feature.auth.domain.JoinForm
import com.diplomado.erp.feature.auth.domain.toRequest
import com.diplomado.erp.feature.auth.domain.validateCompany
import com.diplomado.erp.feature.auth.domain.validateJoin
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Opción elegida en "Crear cuenta" (null = todavía eligiendo). */
enum class RegisterMode { Company, Join }

data class RegisterUiState(
    val mode: RegisterMode? = null,
    val join: JoinForm = JoinForm(),
    val company: CompanyForm = CompanyForm(),
    val errors: Map<String, String> = emptyMap(),
    val serverError: String? = null,
    val loading: Boolean = false,
    val connectionMessage: String? = null,
    /** "¡Cuenta creada!" (unirse) o "¡Solicitud enviada!" (empresa). */
    val succeeded: Boolean = false
)

/** Crear cuenta: "Registrar mi empresa" o "Unirme a mi empresa", igual que RegisterScreen.js. */
class RegisterViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(RegisterUiState())
    val uiState: StateFlow<RegisterUiState> = _uiState.asStateFlow()

    fun choose(mode: RegisterMode) = _uiState.update { it.copy(mode = mode, errors = emptyMap(), serverError = null) }

    /** "← Cambiar opción": vuelve a elegir sin perder lo escrito (igual que la web). */
    fun changeOption() = _uiState.update { it.copy(mode = null, errors = emptyMap(), serverError = null) }

    fun updateJoin(field: String, transform: (JoinForm) -> JoinForm) = _uiState.update {
        it.copy(join = transform(it.join), errors = it.errors - field, serverError = null)
    }

    fun updateCompany(field: String, transform: (CompanyForm) -> CompanyForm) = _uiState.update {
        it.copy(company = transform(it.company), errors = it.errors - field, serverError = null)
    }

    fun submit() {
        val state = _uiState.value
        if (state.loading || state.mode == null) return
        val errors = if (state.mode == RegisterMode.Join) validateJoin(state.join) else validateCompany(state.company)
        _uiState.update { it.copy(errors = errors, serverError = null, connectionMessage = null) }
        if (errors.isNotEmpty()) return

        _uiState.update { it.copy(loading = true) }
        viewModelScope.launch {
            val result = authRequest(onSlow = ::setSlow) {
                if (state.mode == RegisterMode.Join) RetrofitClient.api.register(state.join.toRequest())
                else RetrofitClient.api.registerCompany(state.company.toRequest())
            }
            _uiState.update {
                when (result) {
                    is AuthResult.Ok -> it.copy(loading = false, succeeded = true)
                    is AuthResult.Rejected -> it.copy(
                        loading = false,
                        // La web suma los detalles de validación sólo en el alta de empresa.
                        serverError = if (state.mode == RegisterMode.Company) result.error.fullMessage(CONNECTION_FAILED_MESSAGE)
                        else result.error.message ?: CONNECTION_FAILED_MESSAGE
                    )
                    is AuthResult.TimedOut -> it.copy(loading = false, connectionMessage = CONNECTION_TIMEOUT_MESSAGE)
                    is AuthResult.Failed -> it.copy(loading = false, serverError = result.message)
                }
            }
        }
    }

    private fun setSlow(slow: Boolean) = _uiState.update {
        if (!it.loading) it else it.copy(connectionMessage = if (slow) CONNECTION_SLOW_MESSAGE else null)
    }
}

data class ForgotPasswordUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val submitted: Boolean = false
)

/** Recuperar contraseña (POST /auth/forgot-password), igual que ForgotPasswordScreen.js. */
class ForgotPasswordViewModel : ViewModel() {

    private val _uiState = MutableStateFlow(ForgotPasswordUiState())
    val uiState: StateFlow<ForgotPasswordUiState> = _uiState.asStateFlow()

    fun submit(email: String) {
        if (email.isBlank() || _uiState.value.loading) return
        _uiState.value = ForgotPasswordUiState(loading = true)
        viewModelScope.launch {
            val result = authRequest(onSlow = {}) {
                RetrofitClient.api.forgotPassword(
                    com.diplomado.erp.core.network.dto.ForgotPasswordRequest(email.trim().lowercase())
                )
            }
            _uiState.value = when (result) {
                is AuthResult.Ok -> ForgotPasswordUiState(submitted = true)
                is AuthResult.Rejected -> ForgotPasswordUiState(error = result.error.message ?: FORGOT_FALLBACK)
                is AuthResult.TimedOut -> ForgotPasswordUiState(error = CONNECTION_TIMEOUT_MESSAGE)
                is AuthResult.Failed -> ForgotPasswordUiState(error = result.message)
            }
        }
    }

    private companion object {
        const val FORGOT_FALLBACK = "No fue posible enviar la solicitud."
    }
}
