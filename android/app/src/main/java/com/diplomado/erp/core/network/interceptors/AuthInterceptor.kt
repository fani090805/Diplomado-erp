package com.diplomado.erp.core.network.interceptors

import com.diplomado.erp.core.security.TokenStorage
import okhttp3.Interceptor
import okhttp3.Response

class AuthInterceptor : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val accessToken = TokenStorage.getAccessToken()

        // Si la petición es pública (ej: /auth/login), no adjuntar token
        if (originalRequest.header("No-Authentication") != null) {
            val requestWithoutHeader = originalRequest.newBuilder()
                .removeHeader("No-Authentication")
                .build()
            return chain.proceed(requestWithoutHeader)
        }

        val newRequest = if (!accessToken.isNullOrEmpty()) {
            originalRequest.newBuilder()
                .header("Authorization", "Bearer $accessToken")
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .build()
        } else {
            originalRequest
        }

        return chain.proceed(newRequest)
    }
}
