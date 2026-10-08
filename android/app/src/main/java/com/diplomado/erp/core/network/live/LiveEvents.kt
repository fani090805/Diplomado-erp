package com.diplomado.erp.core.network.live

import com.diplomado.erp.BuildConfig
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.LiveEventDto
import com.diplomado.erp.core.security.TokenStorage
import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.sse.EventSource
import okhttp3.sse.EventSourceListener
import okhttp3.sse.EventSources
import java.net.URLEncoder
import java.util.concurrent.TimeUnit
import kotlin.math.min

/**
 * Canal de cambios EN VIVO (Server-Sent Events) — el mismo que usa la web.
 *
 * - start(): pide un boleto de un solo uso (POST /events/ticket, con el JWT
 *   vía AuthInterceptor) y abre GET /events/stream?ticket=… con okhttp-sse.
 * - Los eventos sólo dicen QUÉ cambió ({ type, entity, id, action, at }); los
 *   ViewModels vuelven a pedir sus datos (ver refreshOnLive).
 * - Si se cae, reconecta con espera progresiva (1 s, 2 s, 4 s… hasta 30 s).
 * - MainActivity conecta al pasar a primer plano y desconecta en segundo plano;
 *   al volver emite RESUME para que la pantalla actual se refresque.
 */
object LiveEvents {

    /** Evento sintético "volvió a primer plano": lo escuchan todas las pantallas. */
    val RESUME = LiveEventDto(type = "app.resume", entity = ALL, action = "resume")

    private const val MAX_DELAY_MS = 30_000L

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val gson = Gson()

    /** Conexión SSE: sin timeout de lectura (el backend manda un ping cada 25 s). */
    private val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .build()
    }

    private val _events = MutableSharedFlow<LiveEventDto>(extraBufferCapacity = 64)
    val events: SharedFlow<LiveEventDto> = _events.asSharedFlow()

    private val _connected = MutableStateFlow(false)
    val connected: StateFlow<Boolean> = _connected.asStateFlow()

    @Volatile private var wanted = false
    @Volatile private var source: EventSource? = null
    @Volatile private var connectJob: Job? = null
    @Volatile private var attempt = 0

    /** Conecta si hay sesión. Idempotente. */
    @Synchronized
    fun start() {
        if (TokenStorage.getAccessToken().isNullOrEmpty()) return
        wanted = true
        if (source == null && connectJob?.isActive != true) connect(0)
    }

    /** Desconecta (segundo plano o cierre de sesión). */
    @Synchronized
    fun stop() {
        wanted = false
        connectJob?.cancel()
        connectJob = null
        source?.cancel()
        source = null
        attempt = 0
        _connected.value = false
    }

    /** Pide a las pantallas visibles que se refresquen (al volver a primer plano). */
    fun notifyResume() {
        _events.tryEmit(RESUME)
    }

    /** Eventos de estas entidades (más RESUME). */
    fun changes(vararg entities: String): Flow<LiveEventDto> =
        events.filter { it.entity == ALL || it.entity in entities }

    private fun connect(delayMs: Long) {
        connectJob = scope.launch {
            if (delayMs > 0) delay(delayMs)
            if (!wanted) return@launch
            val ticket = runCatching { RetrofitClient.api.getEventsTicket() }
                .getOrNull()
                ?.takeIf { it.isSuccessful }
                ?.body()?.data?.ticket
            if (ticket == null) {
                scheduleRetry()
                return@launch
            }
            val url = BuildConfig.API_BASE_URL + "events/stream?ticket=" + URLEncoder.encode(ticket, "UTF-8")
            val request = Request.Builder().url(url).header("Accept", "text/event-stream").build()
            synchronized(this@LiveEvents) {
                if (wanted) source = EventSources.createFactory(client).newEventSource(request, listener)
            }
        }
    }

    private fun scheduleRetry() {
        if (!wanted) return
        val delayMs = min(MAX_DELAY_MS, 1000L shl min(attempt, 5))
        attempt += 1
        connect(delayMs)
    }

    private val listener = object : EventSourceListener() {
        override fun onOpen(eventSource: EventSource, response: Response) {
            attempt = 0
            _connected.value = true
        }

        override fun onEvent(eventSource: EventSource, id: String?, type: String?, data: String) {
            val event = runCatching { gson.fromJson(data, LiveEventDto::class.java) }.getOrNull() ?: return
            if (event.entity.isNotEmpty()) _events.tryEmit(event)
        }

        override fun onClosed(eventSource: EventSource) = dropped(eventSource)

        override fun onFailure(eventSource: EventSource, t: Throwable?, response: Response?) = dropped(eventSource)
    }

    @Synchronized
    private fun dropped(eventSource: EventSource) {
        if (source === eventSource) source = null
        _connected.value = false
        // El boleto ya se canjeó: el reintento pide uno nuevo.
        scheduleRetry()
    }

    const val ALL = "*"
}
