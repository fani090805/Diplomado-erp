package com.diplomado.erp.core.meta

import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.AppMetaDto
import com.diplomado.erp.core.network.dto.MetaStatusDto
import com.diplomado.erp.core.security.TokenStorage
import com.google.gson.Gson
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Configuración compartida con la web (GET /api/v1/meta): etiquetas y tonos de
 * estado, módulos del menú, moneda y versión mínima de la app.
 *
 * Se carga al entrar a la app y se guarda en la sesión (TokenStorage, se borra
 * al cerrar sesión). Si /meta falla, se usan los valores por defecto de cada
 * componente (TTBadge, navSections).
 */
object AppMeta {

    private val gson = Gson()
    private val _meta = MutableStateFlow<AppMetaDto?>(null)
    val meta: StateFlow<AppMetaDto?> = _meta.asStateFlow()

    @Volatile private var statusIndex: Map<String, MetaStatusDto> = emptyMap()

    /** Arranca con la copia de la sesión (si hay) y la actualiza desde la API. */
    suspend fun load() {
        if (_meta.value == null) {
            TokenStorage.getAppMetaJson()
                ?.let { runCatching { gson.fromJson(it, AppMetaDto::class.java) }.getOrNull() }
                ?.let(::apply)
        }
        val fresh = runCatching { RetrofitClient.api.getAppMeta() }
            .getOrNull()
            ?.takeIf { it.isSuccessful }
            ?.body()?.data ?: return
        apply(fresh)
        TokenStorage.saveAppMetaJson(gson.toJson(fresh))
    }

    fun clear() {
        _meta.value = null
        statusIndex = emptyMap()
    }

    /** Etiqueta y tono de un estado (exacto, en MAYÚSCULAS o en minúsculas). */
    fun status(code: String): MetaStatusDto? =
        statusIndex[code] ?: statusIndex[code.uppercase()] ?: statusIndex[code.lowercase()]

    /** true si /meta pide una versión de la app más nueva que la instalada. */
    fun needsUpdate(versionCode: Int): Boolean = (_meta.value?.minAndroidVersionCode ?: 0) > versionCode

    private fun apply(value: AppMetaDto) {
        val index = LinkedHashMap<String, MetaStatusDto>()
        // Gson no aplica los valores por defecto de Kotlin: un campo ausente llega como null.
        val statuses: Map<String, List<MetaStatusDto>?>? = value.statuses
        statuses?.values?.forEach { list -> list?.forEach { index.putIfAbsent(it.code, it) } }
        statusIndex = index
        _meta.value = value
    }
}
