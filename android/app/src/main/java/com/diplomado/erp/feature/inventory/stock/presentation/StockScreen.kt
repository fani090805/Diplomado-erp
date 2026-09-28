package com.diplomado.erp.feature.inventory.stock.presentation

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

    Box(modifier = modifier.fillMaxSize().padding(16.dp)) {
        when (val state = uiState) {
            is StockUiState.Loading -> TTLoading(text = "Cargando existencias de almacén...")
            is StockUiState.Error -> {
                TTEmptyState(
                    title = "Error de existencias",
                    description = state.message,
                    actionLabel = "Reintentar",
                    onAction = { viewModel.loadStock() }
                )
            }
            is StockUiState.Success -> {
                TTDataTable(
                    title = "Existencias",
                    subtitle = "${state.stockLevels.size} registros",
                    items = state.stockLevels,
                    emptyText = "Sin existencias registradas."
                ) { stock ->
                    TTCard(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = stock.product?.name ?: "Producto sin nombre",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TecodeTextPrimary
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "SKU: ${stock.product?.sku ?: "—"} • Almacén: ${stock.warehouse?.name ?: "General"}",
                                    fontSize = 12.sp,
                                    color = TecodeTextMuted
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "${stock.quantity} ${stock.product?.unit ?: "ud"}",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = TecodeAccent
                                )
                                val min = stock.product?.minStock ?: 0.0
                                if (stock.quantity <= min && min > 0) {
                                    TTBadge(status = "LOCKED", customLabel = "Stock Bajo")
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
