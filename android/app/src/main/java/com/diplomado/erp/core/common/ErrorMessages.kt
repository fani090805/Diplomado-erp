package com.diplomado.erp.core.common

import android.util.Log
import com.google.gson.JsonParseException
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

/** Mensaje amable para errores de red (el servidor de Render puede "despertar" lento). */
const val SERVER_WAKING_MESSAGE = "Conectando con el servidor, puede tardar unos segundos la primera vez…"

/** La respuesta llegó, pero la app no la entiende (contrato de la API distinto al DTO). */
const val UNREADABLE_RESPONSE_MESSAGE =
    "No pudimos leer la respuesta del servidor. Actualiza la app o avisa al administrador."

const val API_LOG_TAG = "FAI-API"

/**
 * Error al LEER datos (Gson): JsonSyntaxException / JsonIOException (ambas JsonParseException)
 * o IllegalStateException ("Expected BEGIN_OBJECT but was STRING…"). No es un problema de red.
 */
fun isUnreadableResponse(error: Throwable): Boolean =
    error is JsonParseException || error is IllegalStateException

fun friendlyError(error: Throwable, fallback: String = "Ocurrió un error inesperado. Intenta de nuevo."): String =
    when {
        error is SocketTimeoutException -> "El servidor tardó en responder. $SERVER_WAKING_MESSAGE"
        error is UnknownHostException -> "Sin conexión a internet. Revisa tu red e intenta de nuevo."
        error is IOException -> "No fue posible conectar con el servidor. Intenta de nuevo en un momento."
        isUnreadableResponse(error) -> {
            Log.e(API_LOG_TAG, "Respuesta de la API ilegible (¿DTO desactualizado?): ${error.message}", error)
            UNREADABLE_RESPONSE_MESSAGE
        }
        else -> fallback
    }
