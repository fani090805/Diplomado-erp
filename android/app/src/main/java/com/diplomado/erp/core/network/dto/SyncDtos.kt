package com.diplomado.erp.core.network.dto

import com.google.gson.annotations.SerializedName

// Sincronización web ↔ Android: canal en vivo (/events) y configuración compartida (/meta).

/** POST /events/ticket → boleto de un solo uso (60 s) para abrir el stream SSE. */
data class EventTicketDto(
    @SerializedName("ticket") val ticket: String,
    @SerializedName("expiresInSeconds") val expiresInSeconds: Int = 60
)

/** Evento del stream: sólo dice QUÉ cambió; la app vuelve a pedir el dato a la API. */
data class LiveEventDto(
    @SerializedName("type") val type: String = "",
    @SerializedName("entity") val entity: String = "",
    @SerializedName("id") val id: String? = null,
    @SerializedName("action") val action: String = "",
    @SerializedName("at") val at: String? = null
)

/** GET /meta: estados, menú, moneda y versión mínima de la app (igual que la web). */
data class AppMetaDto(
    @SerializedName("statuses") val statuses: Map<String, List<MetaStatusDto>> = emptyMap(),
    @SerializedName("modules") val modules: List<MetaModuleDto> = emptyList(),
    @SerializedName("currency") val currency: String = "MXN",
    @SerializedName("locale") val locale: String = "es-MX",
    @SerializedName("minAndroidVersionCode") val minAndroidVersionCode: Int = 1
)

data class MetaStatusDto(
    @SerializedName("code") val code: String,
    @SerializedName("label") val label: String,
    @SerializedName("tone") val tone: String
)

data class MetaModuleDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("shortName") val shortName: String? = null,
    @SerializedName("icon") val icon: String? = null,
    @SerializedName("permission") val permission: String? = null,
    @SerializedName("section") val section: String? = null,
    @SerializedName("platformOnly") val platformOnly: Boolean = false
)
