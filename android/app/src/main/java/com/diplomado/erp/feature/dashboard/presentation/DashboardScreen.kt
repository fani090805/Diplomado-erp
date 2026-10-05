package com.diplomado.erp.feature.dashboard.presentation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.AccountBalanceWallet
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Insights
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Sell
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.diplomado.erp.core.common.formatMoneyRounded
import com.diplomado.erp.core.common.formatMonthLabel
import com.diplomado.erp.core.common.todayLabel
import com.diplomado.erp.core.security.TokenStorage
import com.diplomado.erp.ui.components.*
import com.diplomado.erp.ui.theme.*

/** Ruta de la bitácora completa (enlace "Ver todo" de la actividad). */
const val AUDIT_ROUTE = "audit"

@Composable
fun DashboardScreen(
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: DashboardViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val columns = if (LocalConfiguration.current.screenWidthDp >= 600) 4 else 2
    val firstName = TokenStorage.getUserName().trim().substringBefore(" ").ifEmpty { "de nuevo" }

    TTRefreshable(
        loading = uiState is DashboardUiState.Loading,
        onRefresh = { viewModel.loadData() },
        modifier = modifier.fillMaxSize()
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item(key = "greeting") { Greeting(firstName) }

            when (val state = uiState) {
                is DashboardUiState.Loading -> item(key = "skeleton") { DashboardSkeleton(columns) }
                is DashboardUiState.Error -> item(key = "error") {
                    TTErrorState(message = state.message, onRetry = { viewModel.loadData() })
                }
                is DashboardUiState.Success -> {
                    val data = state.data
                    if (data.canSeeReports) {
                        item(key = "kpis") { KpiGrid(data, columns) }
                        item(key = "sales") {
                            SalesPerformanceCard(state = state, onSelectRange = viewModel::selectRange)
                        }
                    } else {
                        item(key = "noReports") {
                            TTEmptyState(
                                title = "Indicadores no disponibles",
                                description = "Tu rol no tiene acceso a los reportes de la empresa.",
                                icon = Icons.Outlined.Insights,
                                bordered = false
                            )
                        }
                    }
                    item(key = "status") { OperationalStatusCard() }
                    if (data.canSeeActivity) {
                        item(key = "activity") {
                            ActivityCard(state = state, onSeeAll = { onNavigate(AUDIT_ROUTE) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Greeting(firstName: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            text = "Hola, $firstName",
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            fontFamily = FaiFontFamily,
            color = FaiTextPrimary,
            modifier = Modifier.semantics { heading() }
        )
        Text(
            text = todayLabel(),
            fontSize = 12.sp,
            fontFamily = FaiFontFamily,
            color = FaiTextMuted
        )
    }
}

@Composable
private fun KpiGrid(data: DashboardData, columns: Int) {
    val kpis = data.kpis
    val salesTrend = computeTrend(data.salesSeries)
    val purchasesTrend = computeTrend(data.purchasesSeries)
    val cards: List<@Composable (Modifier) -> Unit> = listOf(
        { m ->
            KpiCard(
                label = "Ventas",
                value = kpis?.sales?.let { formatMoneyRounded(it.total) },
                detail = kpis?.sales?.let { "${it.count} aprobadas" } ?: "Sin ventas registradas",
                icon = Icons.Outlined.Sell,
                trend = salesTrend,
                modifier = m
            )
        },
        { m ->
            KpiCard(
                label = "Compras",
                value = kpis?.purchases?.let { formatMoneyRounded(it.total) },
                detail = kpis?.purchases?.let { "${it.count} aprobadas" } ?: "Sin compras registradas",
                icon = Icons.Outlined.ShoppingCart,
                trend = purchasesTrend,
                modifier = m
            )
        },
        { m ->
            KpiCard(
                label = "Neto",
                value = kpis?.net?.let { formatMoneyRounded(it) },
                detail = "Ingresos − gastos",
                icon = Icons.Outlined.AccountBalanceWallet,
                trend = null,
                modifier = m
            )
        },
        { m ->
            KpiCard(
                label = "Inventario",
                value = data.inventory?.totalValue?.let { formatMoneyRounded(it) },
                detail = data.inventory?.lowStock?.let { "$it en stock bajo" } ?: "Valor a costo",
                icon = Icons.Outlined.Inventory2,
                trend = null,
                modifier = m
            )
        }
    )

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        cards.chunked(columns).forEach { rowCards ->
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.height(IntrinsicSize.Max)) {
                rowCards.forEach { card -> card(Modifier.weight(1f).fillMaxHeight()) }
            }
        }
    }
}

@Composable
private fun SalesPerformanceCard(state: DashboardUiState.Success, onSelectRange: (SalesRange) -> Unit) {
    val sales = state.data.kpis?.sales
    val bars = state.data.salesSeries.takeLast(6).map { ChartBar(formatMonthLabel(it.month), it.total) }

    TTCard {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = "Desempeño de ventas",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FaiFontFamily,
                    color = FaiTextPrimary,
                    modifier = Modifier.semantics { heading() }
                )
                Text(
                    text = "Datos reales del reporte de ventas",
                    fontSize = 12.sp,
                    fontFamily = FaiFontFamily,
                    color = FaiTextMuted
                )
            }
            RangeSegmentedControl(selected = state.range, onSelect = onSelectRange, modifier = Modifier.fillMaxWidth())
            AnimatedVisibility(visible = state.rangeLoading, enter = fadeIn(), exit = fadeOut()) {
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    color = FaiPrimary,
                    trackColor = FaiPrimaryGlow
                )
            }
            Row(verticalAlignment = Alignment.Bottom) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = sales?.let { formatMoneyRounded(it.total) } ?: "Sin datos aún",
                        fontSize = if (sales != null) 26.sp else 16.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FaiFontFamily,
                        color = if (sales != null) FaiTextPrimary else FaiTextMuted
                    )
                    Text(
                        text = if (sales != null) "Total aprobado en el periodo" else "Sin ventas registradas",
                        fontSize = 12.sp,
                        fontFamily = FaiFontFamily,
                        color = FaiTextMuted
                    )
                }
                TrendPill(value = computeTrend(state.data.salesSeries))
            }
            if (bars.isEmpty()) {
                TTEmptyState(
                    title = "Sin datos aún",
                    description = "Cuando se aprueben ventas en este periodo verás aquí su evolución por mes.",
                    icon = Icons.Outlined.Insights,
                    bordered = false
                )
            } else {
                SalesBarChart(bars = bars)
                Text(
                    text = "Toca una barra para ver su monto.",
                    fontSize = 11.sp,
                    fontFamily = FaiFontFamily,
                    color = FaiTextMuted
                )
            }
        }
    }
}

@Composable
private fun ActivityCard(state: DashboardUiState.Success, onSeeAll: () -> Unit) {
    val items = state.data.activity
    TTCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "Actividad reciente",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                fontFamily = FaiFontFamily,
                color = FaiTextPrimary,
                modifier = Modifier.weight(1f).semantics { heading() }
            )
            TextButton(onClick = onSeeAll) {
                Text(
                    text = "Ver todo",
                    fontSize = 13.sp,
                    fontFamily = FaiFontFamily,
                    fontWeight = FontWeight.SemiBold,
                    color = FaiPrimary
                )
                Spacer(modifier = Modifier.width(4.dp))
                Icon(
                    Icons.AutoMirrored.Outlined.ArrowForward,
                    contentDescription = null,
                    tint = FaiPrimary,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
        if (items.isEmpty()) {
            TTEmptyState(
                title = "Sin actividad todavía",
                description = "Aquí verás las ventas, compras y movimientos que registre tu equipo.",
                icon = Icons.Outlined.History,
                bordered = false
            )
        } else {
            items.forEachIndexed { index, item ->
                if (index > 0) HorizontalDivider(color = FaiBorder, thickness = 1.dp)
                TTActivityRow(item)
            }
        }
    }
}
