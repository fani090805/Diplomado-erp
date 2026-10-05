package com.diplomado.erp.core.common

import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

/** Mensaje amable para errores de red (el servidor de Render puede "despertar" lento). */
const val SERVER_WAKING_MESSAGE = "Conectando con el servidor, puede tardar unos segundos la primera vez…"

fun friendlyError(error: Throwable, fallback: String = "Ocurrió un error inesperado. Intenta de nuevo."): String =
    when (error) {
        is SocketTimeoutException -> "El servidor tardó en responder. $SERVER_WAKING_MESSAGE"
        is UnknownHostException -> "Sin conexión a internet. Revisa tu red e intenta de nuevo."
        is IOException -> "No fue posible conectar con el servidor. Intenta de nuevo en un momento."
        else -> fallback
    }
