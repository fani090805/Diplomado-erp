package com.diplomado.erp.core.network

import com.diplomado.erp.core.network.dto.ApiResponse
import com.google.gson.JsonElement
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import retrofit2.Response

/**
 * Error que manda el backend: `{ success: false, error: { code, message, details } }`.
 *
 * En Retrofit, `body()` es null cuando la respuesta NO es 2xx: el mensaje vive en
 * `errorBody()`. Este helper lo lee para mostrar el mensaje del servidor tal cual
 * (igual que la web), en vez de un texto genérico.
 */
data class ServerError(
    val status: Int,
    val code: String?,
    val message: String?,
    /** Mensajes de validación (`details.body[].message` o `details[].message`). */
    val detailMessages: List<String> = emptyList()
) {
    /** Mensaje del servidor + detalles de validación (como CompanyRequestForm de la web). */
    fun fullMessage(fallback: String): String {
        val base = message?.takeIf { it.isNotBlank() } ?: return fallback
        return if (detailMessages.isEmpty()) base else "$base ${detailMessages.joinToString(" ")}"
    }
}

/**
 * Lee el error de la respuesta. OJO: `errorBody()` sólo se puede leer una vez;
 * guarda el resultado si lo necesitas en varios lugares.
 */
fun Response<*>.serverError(): ServerError {
    val fromErrorBody = runCatching { errorBody()?.string() }.getOrNull()
        ?.let { raw -> runCatching { JsonParser.parseString(raw) }.getOrNull() }
        ?.takeIf { it.isJsonObject }
        ?.asJsonObject
        ?.getAsJsonObjectOrNull("error")
    // 2xx con success=false (poco común): el error viene en el body ya parseado.
    val fromBody = (body() as? ApiResponse<*>)?.error

    return when {
        fromErrorBody != null -> ServerError(
            status = code(),
            code = fromErrorBody.stringOrNull("code"),
            message = fromErrorBody.stringOrNull("message"),
            detailMessages = detailMessages(fromErrorBody.get("details"))
        )
        fromBody != null -> ServerError(code(), fromBody.code, fromBody.message)
        else -> ServerError(code(), null, null)
    }
}

/** Mensaje del servidor o `fallback` si no vino ninguno. */
fun Response<*>.errorMessage(fallback: String): String = serverError().fullMessage(fallback)

private fun JsonObject.getAsJsonObjectOrNull(key: String): JsonObject? =
    get(key)?.takeIf { it.isJsonObject }?.asJsonObject

private fun JsonObject.stringOrNull(key: String): String? =
    get(key)?.takeIf { it.isJsonPrimitive }?.asString

private fun detailMessages(details: JsonElement?): List<String> {
    val list = when {
        details == null || details.isJsonNull -> return emptyList()
        details.isJsonArray -> details.asJsonArray
        details.isJsonObject -> details.asJsonObject.get("body")?.takeIf { it.isJsonArray }?.asJsonArray
        else -> null
    } ?: return emptyList()
    return list.mapNotNull { item ->
        item.takeIf { it.isJsonObject }?.asJsonObject?.stringOrNull("message")?.takeIf { it.isNotBlank() }
    }
}
