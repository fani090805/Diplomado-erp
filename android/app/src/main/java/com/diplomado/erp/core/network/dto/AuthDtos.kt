package com.diplomado.erp.core.network.dto

import com.google.gson.annotations.SerializedName

// Cuentas públicas (sin sesión): mismos cuerpos que la web (AuthContext.js).
// Gson omite los null, así que los opcionales vacíos no se envían (igual que la web).

/** POST /auth/register — "Unirme a mi empresa" con código. */
data class RegisterRequest(
    @SerializedName("name") val name: String,
    @SerializedName("lastName") val lastName: String?,
    @SerializedName("companyCode") val companyCode: String,
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

/** POST /auth/register-company — "Registrar mi empresa" (queda en revisión del super admin). */
data class RegisterCompanyRequest(
    @SerializedName("companyName") val companyName: String,
    @SerializedName("legalName") val legalName: String?,
    @SerializedName("taxId") val taxId: String?,
    @SerializedName("industry") val industry: String,
    @SerializedName("phone") val phone: String?,
    @SerializedName("city") val city: String?,
    @SerializedName("name") val name: String,
    @SerializedName("lastName") val lastName: String?,
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

/** POST /auth/forgot-password. */
data class ForgotPasswordRequest(
    @SerializedName("email") val email: String
)

/** Respuesta `{ message }` de register, register-company y forgot-password. */
data class MessageDto(
    @SerializedName("message") val message: String? = null
)
