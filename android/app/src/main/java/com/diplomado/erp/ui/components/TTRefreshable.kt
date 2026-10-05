package com.diplomado.erp.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.pulltorefresh.PullToRefreshDefaults
import androidx.compose.material3.pulltorefresh.rememberPullToRefreshState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.diplomado.erp.ui.theme.FaiCream
import com.diplomado.erp.ui.theme.FaiPrimary

/**
 * Pull-to-refresh (Material 3) para pantallas con estado Loading/Success/Error.
 * El indicador sólo gira cuando la recarga la inició el gesto: la carga
 * inicial se sigue mostrando con skeletons.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TTRefreshable(
    loading: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    var pulled by remember { mutableStateOf(false) }
    LaunchedEffect(loading) {
        if (!loading) pulled = false
    }
    val state = rememberPullToRefreshState()
    val refreshing = pulled && loading

    PullToRefreshBox(
        isRefreshing = refreshing,
        onRefresh = {
            pulled = true
            onRefresh()
        },
        modifier = modifier,
        state = state,
        indicator = {
            PullToRefreshDefaults.Indicator(
                state = state,
                isRefreshing = refreshing,
                modifier = Modifier.align(Alignment.TopCenter),
                containerColor = FaiCream,
                color = FaiPrimary
            )
        }
    ) {
        Box(content = content)
    }
}
