package com.diplomado.erp.core.network.dto

import com.google.gson.JsonElement
import com.google.gson.annotations.SerializedName

data class ApiResponse<T>(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: T? = null,
    @SerializedName("meta") val meta: MetaDto? = null,
    @SerializedName("error") val error: ApiErrorDto? = null
)

data class MetaDto(
    @SerializedName("page") val page: Int = 1,
    @SerializedName("limit") val limit: Int = 20,
    @SerializedName("total") val total: Int = 0,
    @SerializedName("totalPages") val totalPages: Int = 1
)

data class ApiErrorDto(
    @SerializedName("code") val code: String = "ERROR",
    @SerializedName("message") val message: String = "Ocurrió un error inesperado.",
    /** Lista u objeto (`{ body: [...] }` en validaciones): se lee con serverError(). */
    @SerializedName("details") val details: JsonElement? = null
)

// Auth DTOs
data class LoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class LoginResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String,
    @SerializedName("user") val user: UserDto
)

data class RefreshRequest(
    @SerializedName("refreshToken") val refreshToken: String
)

data class RefreshResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String
)

data class ChangePasswordRequest(
    @SerializedName("currentPassword") val currentPassword: String,
    @SerializedName("newPassword") val newPassword: String
)

data class MeResponse(
    @SerializedName("user") val user: UserDto,
    @SerializedName("role") val role: RoleDto?,
    @SerializedName("company") val company: CompanyDto?,
    @SerializedName("branch") val branch: BranchDto?
)

data class UserDto(
    @SerializedName("_id") val id: String,
    @SerializedName("email") val email: String,
    @SerializedName("name") val name: String,
    @SerializedName("lastName") val lastName: String? = null,
    @SerializedName("status") val status: String = "active"
)

data class RoleDto(
    @SerializedName("_id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("label") val label: String,
    @SerializedName("permissions") val permissions: List<String> = emptyList()
)

data class CompanyDto(
    @SerializedName("_id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("status") val status: String = "active"
)

data class BranchDto(
    @SerializedName("_id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("code") val code: String
)
