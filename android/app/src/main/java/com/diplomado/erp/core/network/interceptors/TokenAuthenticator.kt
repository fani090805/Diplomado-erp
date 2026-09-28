package com.diplomado.erp.core.network.interceptors

import com.diplomado.erp.core.network.dto.ApiResponse
import com.diplomado.erp.core.network.dto.RefreshRequest
import com.diplomado.erp.core.network.dto.RefreshResponse
import com.diplomado.erp.core.security.TokenStorage
import com.google.gson.Gson
import okhttp3.Authenticator
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route

class TokenAuthenticator(private val baseUrl: String) : Authenticator {

    private val lock = Any()

    override fun authenticate(route: Route?, response: Response): Request? {
        // Evitar loops si la propia llamada de refresh devuelve 401
        if (response.request.url.encodedPath.contains("/auth/refresh")) {
            TokenStorage.clear()
            return null
        }

        synchronized(lock) {
            val currentToken = TokenStorage.getAccessToken()
            val refreshToken = TokenStorage.getRefreshToken() ?: return null

            // Si otro hilo ya refrescó el token en paralelo, reintentar con el nuevo token
            val reqToken = response.request.header("Authorization")?.replace("Bearer ", "")
            if (currentToken != null && currentToken != reqToken) {
                return response.request.newBuilder()
                    .header("Authorization", "Bearer $currentToken")
                    .build()
            }

            // Ejecutar refresco atómico síncrono
            val newTokens = performRefresh(refreshToken)
            if (newTokens != null) {
                TokenStorage.saveTokens(newTokens.accessToken, newTokens.refreshToken)
                return response.request.newBuilder()
                    .header("Authorization", "Bearer ${newTokens.accessToken}")
                    .build()
            } else {
                // Refresh fallido / expirado: limpiar sesión
                TokenStorage.clear()
                return null
            }
        }
    }

    private fun performRefresh(refreshToken: String): RefreshResponse? {
        return try {
            val client = OkHttpClient()
            val gson = Gson()
            val jsonBody = gson.toJson(RefreshRequest(refreshToken))
            val requestBody = jsonBody.toRequestBody("application/json".toMediaType())

            val request = Request.Builder()
                .url("${baseUrl}auth/refresh")
                .post(requestBody)
                .build()

            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val bodyStr = response.body?.string()
                val apiResponse = gson.fromJson(bodyStr, ApiResponse::class.java)
                if (apiResponse.success && apiResponse.data != null) {
                    val dataJson = gson.toJson(apiResponse.data)
                    gson.fromJson(dataJson, RefreshResponse::class.java)
                } else null
            } else null
        } catch (e: Exception) {
            null
        }
    }
}
