package com.diplomado.erp.feature.sales.presentation

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
fun SalesOrdersScreen(
    modifier: Modifier = Modifier,
    viewModel: SalesOrdersViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Box(modifier = modifier.fillMaxSize().padding(16.dp)) {
        when (val state = uiState) {
            is SalesOrdersUiState.Loading -> TTLoading(text = "Cargando pedidos de venta...")
            is SalesOrdersUiState.Error -> {
                TTEmptyState(
                    title = "Error de ventas",
                    description = state.message,
                    actionLabel = "Reintentar",
                    onAction = { viewModel.loadOrders() }
                )
            }
            is SalesOrdersUiState.Success -> {
                TTDataTable(
                    title = "Pedidos de Venta",
                    subtitle = "${state.orders.size} pedidos",
                    items = state.orders,
                    onCreateClick = if (PermissionChecker.hasPermission("sales.orders.create")) {
                        { /* Crear pedido */ }
                    } else null,
                    createLabel = "Nuevo pedido",
                    emptyText = "Sin pedidos de venta."
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
                                        color = TecodeTextPrimary
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "Cliente: ${order.customer?.name ?: "Demo"} • Total: $${String.format("%.2f", order.total)}",
                                        fontSize = 13.sp,
                                        color = TecodeTextMuted
                                    )
                                }
                                TTBadge(status = order.status)
                            }

                            if (order.status == "DRAFT" && PermissionChecker.hasPermission("sales.orders.approve")) {
                                Spacer(modifier = Modifier.height(12.dp))
                                TTButton(
                                    text = "Aprobar Pedido",
                                    onClick = { viewModel.approveOrder(order.id) },
                                    variant = TTButtonVariant.Primary,
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
