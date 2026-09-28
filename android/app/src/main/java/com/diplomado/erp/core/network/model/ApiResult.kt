package com.diplomado.erp.core.network.model

sealed class ApiResult<out T> {
    data class Success<out T>(val data: T, val total: Int? = null) : ApiResult<T>()
    data class Error(
        val code: String,
        val message: String,
        val details: List<String> = emptyList(),
        val statusCode: Int = 400
    ) : ApiResult<Nothing>()
    data object Loading : ApiResult<Nothing>()
    data object Unauthorized : ApiResult<Nothing>()
    data object Forbidden : ApiResult<Nothing>()
    data object NetworkError : ApiResult<Nothing>()
}
