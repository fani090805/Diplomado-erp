package com.diplomado.erp.feature.auth.domain

import com.diplomado.erp.core.network.dto.RegisterCompanyRequest
import com.diplomado.erp.core.network.dto.RegisterRequest

/**
 * Reglas de los formularios de cuenta, copiadas de la web (RegisterScreen.js,
 * lib/companyRequest.js y PasswordRequirements.js). El backend siempre revalida.
 */

private val EMAIL_PATTERN = Regex("""^[^\s@]+@[^\s@]+\.[^\s@]+$""")
private val RFC_PATTERN = Regex("""^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$""")

/** Requisito de contraseña que se marca en salvia al cumplirse. */
data class PasswordRequirement(val label: String, val met: Boolean)

fun passwordRequirements(password: String): List<PasswordRequirement> = listOf(
    PasswordRequirement("Mínimo 8 caracteres", password.length >= 8),
    PasswordRequirement("Al menos una letra", password.any { it in 'A'..'Z' || it in 'a'..'z' }),
    PasswordRequirement("Al menos un número", password.any { it.isDigit() })
)

fun isStrongPassword(password: String): Boolean = passwordRequirements(password).all { it.met }

/** Giros de empresa (INDUSTRY_OPTIONS de la web). */
val INDUSTRY_OPTIONS: List<Pair<String, String>> = listOf(
    "comercio" to "Comercio",
    "construccion" to "Construcción",
    "manufactura" to "Manufactura",
    "servicios" to "Servicios",
    "otro" to "Otro"
)

data class JoinForm(
    val name: String = "",
    val lastName: String = "",
    val companyCode: String = "",
    val email: String = "",
    val password: String = "",
    val confirmPassword: String = ""
)

data class CompanyForm(
    val companyName: String = "",
    val legalName: String = "",
    val taxId: String = "",
    val industry: String? = null,
    val phone: String = "",
    val city: String = "",
    val name: String = "",
    val lastName: String = "",
    val email: String = "",
    val password: String = "",
    val confirmPassword: String = ""
)

private fun MutableMap<String, String>.personErrors(name: String, lastName: String, email: String, password: String, confirm: String) {
    if (name.trim().length < 2) this["name"] = "Ingresa un nombre de al menos 2 caracteres."
    if (name.trim().length > 100) this["name"] = "El nombre no puede exceder 100 caracteres."
    if (lastName.trim().length > 100) this["lastName"] = "El apellido no puede exceder 100 caracteres."
    if (!EMAIL_PATTERN.matches(email.trim())) this["email"] = "Ingresa un correo electrónico válido."
    if (!isStrongPassword(password)) this["password"] = "La contraseña debe cumplir todos los requisitos."
    if (confirm != password) this["confirmPassword"] = "Las contraseñas no coinciden."
}

/** Errores por campo de "Unirme a mi empresa" (vacío si es válido). */
fun validateJoin(form: JoinForm): Map<String, String> = buildMap {
    personErrors(form.name, form.lastName, form.email, form.password, form.confirmPassword)
    if (form.companyCode.isBlank()) put("companyCode", "Ingresa el código de tu empresa.")
    if (form.companyCode.trim().length > 10) put("companyCode", "El código de empresa no puede exceder 10 caracteres.")
}

/** Errores por campo de "Registrar mi empresa" (vacío si es válido). */
fun validateCompany(form: CompanyForm): Map<String, String> = buildMap {
    val companyName = form.companyName.trim()
    if (companyName.length < 2) put("companyName", "Ingresa el nombre de la empresa (mínimo 2 caracteres).")
    if (companyName.length > 120) put("companyName", "El nombre no puede exceder 120 caracteres.")
    if (form.legalName.trim().length > 160) put("legalName", "La razón social no puede exceder 160 caracteres.")
    val taxId = form.taxId.trim().uppercase()
    if (taxId.isNotEmpty() && !RFC_PATTERN.matches(taxId)) put("taxId", "El RFC no tiene un formato válido.")
    if (form.industry == null) put("industry", "Selecciona el giro de tu empresa.")
    if (form.phone.trim().length > 30) put("phone", "El teléfono no puede exceder 30 caracteres.")
    if (form.city.trim().length > 100) put("city", "La ciudad no puede exceder 100 caracteres.")
    personErrors(form.name, form.lastName, form.email, form.password, form.confirmPassword)
}

private fun String.optional(): String? = trim().takeIf { it.isNotEmpty() }

fun JoinForm.toRequest() = RegisterRequest(
    name = name.trim(),
    lastName = lastName.optional(),
    companyCode = companyCode.trim().uppercase(),
    email = email.trim().lowercase(),
    password = password
)

fun CompanyForm.toRequest() = RegisterCompanyRequest(
    companyName = companyName.trim(),
    legalName = legalName.optional(),
    taxId = taxId.uppercase().optional(),
    industry = industry.orEmpty(),
    phone = phone.optional(),
    city = city.optional(),
    name = name.trim(),
    lastName = lastName.optional(),
    email = email.trim().lowercase(),
    password = password
)
