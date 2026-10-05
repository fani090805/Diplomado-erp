package com.diplomado.erp.feature.purchases.presentation

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
import com.diplomado.erp.core.common.rbac.PermissionChecker
import com.diplomado.erp.ui.components.*
import com.diplomado.erp.ui.theme.*

@Composable
fun PurchaseOrdersScreen(
    modifier: Modifier = Modifier,
    viewModel: PurchaseOrdersViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Box(modifier = modifier.fillMaxSize().padding(16.dp)) {
        when (val state = uiState) {
            is PurchaseOrdersUiState.Loading -> TTLoading(text = "Cargando órdenes de compra de materiales...")
            is PurchaseOrdersUiState.Error -> {
                TTEmptyState(
                    title = "Error de compras de obra",
                    description = state.message,
                    actionLabel = "Reintentar",
                    onAction = { viewModel.loadOrders() }
                )
            }
            is PurchaseOrdersUiState.Success -> {
                TTDataTable(
                    title = "Órdenes de Compra para Obra",
                    subtitle = "${state.orders.size} compras de insumos registradas",
                    items = state.orders,
                    onCreateClick = if (PermissionChecker.hasPermission("purchases.create")) {
                        { /* Crear orden de compra */ }
                    } else null,
                    createLabel = "Nueva compra",
                    emptyText = "Sin órdenes de compra para obra registradas."
                ) { order ->
                    TTCard(modifier = Modifier.fillMaxWidth()) {
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = "Folio: ${order.code}",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = FaiTextPrimary
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "Proveedor: ${order.supplier?.name ?: "Proveedor de Insumos"} • Total: $${String.format("%.2f", order.total)}",
                                        fontSize = 13.sp,
                                        color = FaiTextMuted
                                    )
                                }
                                TTBadge(status = order.status)
                            }

                            if (order.status == "DRAFT" && PermissionChecker.hasPermission("purchases.approve")) {
                                Spacer(modifier = Modifier.height(12.dp))
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    TTButton(
                                        text = "Aprobar y Recibir",
                                        onClick = { viewModel.approveOrder(order.id) },
                                        variant = TTButtonVariant.Primary,
                                        modifier = Modifier.weight(1f)
                                    )
                                    TTButton(
                                        text = "Rechazar",
                                        onClick = { viewModel.rejectOrder(order.id, "Rechazado desde la app FAI ERP") },
                                        variant = TTButtonVariant.Danger,
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
