package com.diplomado.erp.core.network.live

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.launch

/**
 * Refresca la pantalla cuando llega un evento en vivo de estas entidades (o al
 * volver a primer plano). Agrupa ráfagas con un debounce de 1 s, igual que la
 * web (useLiveUpdates): aprobar una venta emite venta + inventario + ingreso.
 */
@OptIn(FlowPreview::class)
fun ViewModel.refreshOnLive(vararg entities: String, onChange: () -> Unit) {
    viewModelScope.launch {
        LiveEvents.changes(*entities).debounce(1_000).collect { onChange() }
    }
}
