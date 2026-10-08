package com.diplomado.erp.feature.auth.presentation

import com.diplomado.erp.core.common.friendlyError
import com.diplomado.erp.core.network.ServerError
import com.diplomado.erp.core.network.serverError
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import retrofit2.Response
import java.net.SocketTimeoutException

// Mismos textos que la web (LoginScreen / RegisterScreen / CompanyRequestForm).
const val CONNECTION_SLOW_MESSAGE = "Conectando con el servidor, esto puede tardar unos segundos la primera vez…"
const val CONNECTION_TIMEOUT_MESSAGE = "El servidor no responde. Intenta de nuevo en un momento."
const val CONNECTION_FAILED_MESSAGE =
    "No fue posible conectar con el servidor. Revisa tu conexión e inténtalo de nuevo."

private const val SLOW_AFTER_MS = 4_000L
private const val TIMEOUT_MS = 60_000L

/** Resultado de una petición pública de cuentas. */
sealed class AuthResult<out T> {
    data class Ok<T>(val data: T?) : AuthResult<T>()
    /** El servidor respondió con error: mensaje y código tal cual. */
    data class Rejected(val error: ServerError) : AuthResult<Nothing>()
    /** No hubo respuesta en 60 s. */
    data object TimedOut : AuthResult<Nothing>()
    /** Sin conexión u otro fallo antes de tener respuesta. */
    data class Failed(val message: String) : AuthResult<Nothing>()
}

/**
 * Ejecuta la petición avisando `onSlow(true)` a los 4 s (y `false` al terminar),
 * con límite de 60 s, igual que la web.
 */
suspend fun <T> CoroutineScope.authRequest(
    onSlow: (Boolean) -> Unit,
    call: suspend () -> Response<com.diplomado.erp.core.network.dto.ApiResponse<T>>
): AuthResult<T> {
    val slowJob = launch {
        delay(SLOW_AFTER_MS)
        onSlow(true)
    }
    return try {
        val response = withTimeoutOrNull(TIMEOUT_MS) { call() } ?: return AuthResult.TimedOut
        if (response.isSuccessful) AuthResult.Ok(response.body()?.data)
        else AuthResult.Rejected(response.serverError())
    } catch (e: SocketTimeoutException) {
        AuthResult.TimedOut
    } catch (e: java.io.IOException) {
        AuthResult.Failed(CONNECTION_FAILED_MESSAGE)
    } catch (e: kotlinx.coroutines.CancellationException) {
        throw e
    } catch (e: Exception) {
        AuthResult.Failed(friendlyError(e, CONNECTION_FAILED_MESSAGE))
    } finally {
        slowJob.cancel()
        onSlow(false)
    }
}
