package com.diplomado.erp.feature.purchases.presentation

import com.diplomado.erp.core.common.orDash
import com.diplomado.erp.core.common.formatMoney

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

    TTRefreshable(
        loading = uiState is PurchaseOrdersUiState.Loading,
        onRefresh = { viewModel.loadOrders() },
        modifier = modifier.fillMaxSize().padding(16.dp)
    ) {
        when (val state = uiState) {
            is PurchaseOrdersUiState.Loading -> TTLoading(text = "Cargando compras...")
            is PurchaseOrdersUiState.Error -> {
                TTErrorState(
                    title = "Error al cargar compras",
                    message = state.message,
                    onRetry = { viewModel.loadOrders() }
                )
            }
            is PurchaseOrdersUiState.Success -> {
                TTDataTable(
                    title = "Órdenes de compra",
                    subtitle = "${state.orders.size} órdenes",
                    items = state.orders,
                    onCreateClick = if (PermissionChecker.hasPermission("purchases.create")) {
                        { /* Crear orden de compra */ }
                    } else null,
                    createLabel = "Nueva orden",
                    emptyText = "Aún no hay órdenes de compra registradas."
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
                                        text = "Proveedor: ${order.supplierName.orDash()} • Total: ${formatMoney(order.total)}",
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
                                        text = "Aprobar y recibir",
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
