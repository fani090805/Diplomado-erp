package com.diplomado.erp.feature.inventory.movements.presentation

import com.diplomado.erp.core.common.orDash
import com.diplomado.erp.core.common.movementTypeLabel
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

    TTRefreshable(
        loading = uiState is MovementsUiState.Loading,
        onRefresh = { viewModel.loadMovements() },
        modifier = modifier.fillMaxSize().padding(16.dp)
    ) {
        when (val state = uiState) {
            is MovementsUiState.Loading -> TTLoading(text = "Cargando movimientos...")
            is MovementsUiState.Error -> {
                TTErrorState(
                    title = "Error al cargar movimientos",
                    message = state.message,
                    onRetry = { viewModel.loadMovements() }
                )
            }
            is MovementsUiState.Success -> {
                TTDataTable(
                    title = "Movimientos de inventario",
                    subtitle = "${state.total} movimientos",
                    items = state.movements,
                    emptyText = "Aún no hay movimientos registrados."
                ) { movement ->
                    TTCard(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${movementTypeLabel(movement.type)} · ${movement.product?.name.orDash()}",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FaiTextPrimary
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Almacén: ${movement.warehouse?.name.orDash()} • Cantidad: ${movement.quantity}",
                                    fontSize = 12.sp,
                                    color = FaiTextMuted
                                )
                                if (!movement.reason.isNullOrBlank()) {
                                    Text(
                                        text = "Motivo: ${movement.reason}",
                                        fontSize = 11.sp,
                                        color = FaiTextSecondary
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
