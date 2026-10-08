package com.diplomado.erp.feature.inventory.stock.presentation

import com.diplomado.erp.core.common.orDash
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.diplomado.erp.ui.components.*
import com.diplomado.erp.ui.theme.*

@Composable
fun StockScreen(
    modifier: Modifier = Modifier,
    viewModel: StockViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    TTRefreshable(
        loading = uiState is StockUiState.Loading,
        onRefresh = { viewModel.loadStock() },
        modifier = modifier.fillMaxSize().padding(16.dp)
    ) {
        when (val state = uiState) {
            is StockUiState.Loading -> TTLoading(text = "Cargando existencias...")
            is StockUiState.Error -> {
                TTErrorState(
                    title = "Error al cargar existencias",
                    message = state.message,
                    onRetry = { viewModel.loadStock() }
                )
            }
            is StockUiState.Success -> {
                TTDataTable(
                    title = "Existencias",
                    subtitle = "${state.stockLevels.size} registros",
                    items = state.stockLevels,
                    emptyText = "Aún no hay existencias registradas."
                ) { stock ->
                    TTCard(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = stock.product?.name.orDash(),
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FaiTextPrimary
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "SKU: ${stock.product?.sku.orDash()} • Almacén: ${stock.warehouse?.name.orDash()}",
                                    fontSize = 12.sp,
                                    color = FaiTextMuted
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "${stock.quantity} ${stock.product?.unit.orEmpty()}".trim(),
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = FaiPrimary
                                )
                                val min = stock.productId?.let { state.minStockByProduct[it] } ?: 0.0
                                if (stock.quantity <= min && min > 0) {
                                    Spacer(modifier = Modifier.height(2.dp))
                                    TTBadge(status = "LOCKED", customLabel = "Stock bajo")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
