package com.diplomado.erp.feature.inventory.movements.presentation

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
fun MovementsScreen(
    modifier: Modifier = Modifier,
    viewModel: MovementsViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Box(modifier = modifier.fillMaxSize().padding(16.dp)) {
        when (val state = uiState) {
            is MovementsUiState.Loading -> TTLoading(text = "Cargando Kardex de movimientos de materiales...")
            is MovementsUiState.Error -> {
                TTEmptyState(
                    title = "Error de Kardex",
                    description = state.message,
                    actionLabel = "Reintentar",
                    onAction = { viewModel.loadMovements() }
                )
            }
            is MovementsUiState.Success -> {
                TTDataTable(
                    title = "Kardex de Materiales",
                    subtitle = "${state.total} movimientos de insumos registrados",
                    items = state.movements,
                    emptyText = "Sin movimientos de materiales registrados."
                ) { movement ->
                    TTCard(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${movement.type} · ${movement.product?.name ?: "Material"}",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TecodeTextPrimary
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Bodega: ${movement.warehouse?.name ?: "Bodega Central"} • Cantidad: ${movement.quantity}",
                                    fontSize = 12.sp,
                                    color = TecodeTextMuted
                                )
                                if (!movement.reason.isNullOrBlank()) {
                                    Text(
                                        text = "Motivo: ${movement.reason}",
                                        fontSize = 11.sp,
                                        color = TecodeTextSecondary
                                    )
                                }
                            }
                            TTBadge(status = movement.type, customLabel = movement.type)
                        }
                    }
                }
            }
        }
    }
}
