package com.diplomado.erp.feature.auth

import com.diplomado.erp.core.network.serverError
import com.diplomado.erp.feature.auth.domain.CompanyForm
import com.diplomado.erp.feature.auth.domain.JoinForm
import com.diplomado.erp.feature.auth.domain.passwordRequirements
import com.diplomado.erp.feature.auth.domain.toRequest
import com.diplomado.erp.feature.auth.domain.validateCompany
import com.diplomado.erp.feature.auth.domain.validateJoin
import com.diplomado.erp.feature.auth.presentation.AuthResult
import com.diplomado.erp.feature.auth.presentation.LOGIN_FALLBACK_MESSAGE
import com.diplomado.erp.feature.auth.presentation.noticeFor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.Response
import java.io.File

/** Reglas de cuentas iguales a la web y avisos del login con los errores reales del backend. */
class AuthRulesTest {

    private fun fixture(name: String): String =
        File(javaClass.classLoader!!.getResource("contracts/$name.json")!!.toURI()).readText()

    private fun rejected(name: String, status: Int) =
        AuthResult.Rejected(Response.error<Any>(status, fixture(name).toResponseBody("application/json".toMediaType())).serverError())

    @Test
    fun `aviso ambar para cuenta pendiente y empresa en revision`() {
        val pending = noticeFor(rejected("error-login-account-pending", 403))
        assertTrue(pending.pending)
        assertEquals("Tu cuenta está pendiente de aprobación por el administrador.", pending.message)
        assertTrue(noticeFor(rejected("error-login-company-in-review", 403)).pending)
    }

    @Test
    fun `aviso rojo con el mensaje del servidor para credenciales y empresa suspendida`() {
        val invalid = noticeFor(rejected("error-login-invalid-credentials", 401))
        assertFalse(invalid.pending)
        assertEquals("Correo o contraseña incorrectos.", invalid.message)
        val suspended = noticeFor(rejected("error-login-company-suspended", 401))
        assertFalse(suspended.pending)
        assertEquals("Tu empresa está suspendida. Contacta al soporte.", suspended.message)
    }

    @Test
    fun `sin mensaje del servidor se usa el texto de la web`() {
        val empty = AuthResult.Rejected(Response.error<Any>(500, "".toResponseBody(null)).serverError())
        assertEquals(LOGIN_FALLBACK_MESSAGE, noticeFor(empty).message)
    }

    @Test
    fun `requisitos de contrasena como PasswordRequirements de la web`() {
        assertEquals(listOf(false, false, false), passwordRequirements("").map { it.met })
        assertEquals(listOf(false, true, true), passwordRequirements("abc1").map { it.met })
        assertEquals(listOf(true, true, true), passwordRequirements("Clave1234").map { it.met })
    }

    @Test
    fun `unirse con codigo valida igual que la web y envia el codigo en mayusculas`() {
        val errors = validateJoin(JoinForm(name = "A", email = "x", password = "corta", confirmPassword = "otra"))
        assertEquals("Ingresa un nombre de al menos 2 caracteres.", errors["name"])
        assertEquals("Ingresa el código de tu empresa.", errors["companyCode"])
        assertEquals("Ingresa un correo electrónico válido.", errors["email"])
        assertEquals("La contraseña debe cumplir todos los requisitos.", errors["password"])
        assertEquals("Las contraseñas no coinciden.", errors["confirmPassword"])

        val ok = JoinForm("Ana", "", " fai-abc123 ", " Ana@Mail.com ", "Clave1234", "Clave1234")
        assertTrue(validateJoin(ok).isEmpty())
        val request = ok.toRequest()
        assertEquals("FAI-ABC123", request.companyCode)
        assertEquals("ana@mail.com", request.email)
        assertNull(request.lastName)
    }

    @Test
    fun `registrar empresa valida RFC y giro como la web`() {
        val errors = validateCompany(CompanyForm(companyName = "Ferretería", taxId = "malo"))
        assertEquals("El RFC no tiene un formato válido.", errors["taxId"])
        assertEquals("Selecciona el giro de tu empresa.", errors["industry"])

        val ok = CompanyForm(
            companyName = "Ferretería El Martillo", taxId = "xaxx010101000", industry = "comercio",
            name = "Rita", email = "rita@martillo.mx", password = "Clave1234", confirmPassword = "Clave1234"
        )
        assertTrue(validateCompany(ok).isEmpty())
        assertEquals("XAXX010101000", ok.toRequest().taxId)
        assertNull(ok.toRequest().phone)
    }
}
