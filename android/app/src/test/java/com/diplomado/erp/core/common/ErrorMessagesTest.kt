package com.diplomado.erp.core.common

import com.diplomado.erp.core.network.dto.ApiResponse
import com.diplomado.erp.core.network.dto.CustomerDto
import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import com.google.gson.reflect.TypeToken
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.IOException
import java.net.SocketTimeoutException
import java.net.UnknownHostException

/** Forma vieja de SalesOrderDto (Gson no deserializa clases locales: va a nivel de archivo). */
private data class OldSalesOrder(val customerId: CustomerDto?)

/** Los errores de red y los de lectura de datos no se confunden. */
class ErrorMessagesTest {

    @Test
    fun `sin conexion y timeout son errores de red`() {
        assertTrue(friendlyError(UnknownHostException()).startsWith("Sin conexión"))
        assertTrue(friendlyError(SocketTimeoutException()).startsWith("El servidor tardó"))
        assertTrue(friendlyError(IOException()).startsWith("No fue posible conectar"))
    }

    @Test
    fun `un DTO que no coincide con la respuesta es error de lectura, no de red`() {
        // El caso real: el backend manda customerId como texto y el DTO viejo esperaba un objeto.
        val type = TypeToken.getParameterized(ApiResponse::class.java, OldSalesOrder::class.java).type
        val error = runCatching {
            Gson().fromJson<ApiResponse<OldSalesOrder>>("""{"success":true,"data":{"customerId":"abc"}}""", type)
        }.exceptionOrNull()!!

        assertTrue(error is JsonSyntaxException)
        assertEquals(UNREADABLE_RESPONSE_MESSAGE, friendlyError(error, "fallback"))
        assertEquals(UNREADABLE_RESPONSE_MESSAGE, friendlyError(IllegalStateException("Expected BEGIN_OBJECT")))
    }

    @Test
    fun `otros errores usan el mensaje de la pantalla`() {
        assertEquals("No pudimos cargar ventas.", friendlyError(RuntimeException(), "No pudimos cargar ventas."))
        assertNotEquals(UNREADABLE_RESPONSE_MESSAGE, friendlyError(IOException()))
    }
}
