package com.diplomado.erp.feature.inventory.products.presentation

import com.diplomado.erp.core.common.formatMoney
import androidx.compose.foundation.layout.*
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.diplomado.erp.core.common.rbac.PermissionChecker
import com.diplomado.erp.core.network.dto.ProductDto
import com.diplomado.erp.ui.components.*
import com.diplomado.erp.ui.theme.*

private data class ProductConfirmation(val product: ProductDto, val action: String)

@Composable
fun ProductsScreen(
    modifier: Modifier = Modifier,
    viewModel: ProductsViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()
    val activeTab by viewModel.activeTab.collectAsState()
    var confirmation by remember { mutableStateOf<ProductConfirmation?>(null) }
    var notice by remember { mutableStateOf<String?>(null) }

    TTRefreshable(
        loading = uiState is ProductsUiState.Loading,
        onRefresh = { viewModel.loadProducts() },
        modifier = modifier.fillMaxSize().padding(16.dp)
    ) {
      Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        TabRow(selectedTabIndex = if (activeTab == "active") 0 else 1) {
            Tab(
                selected = activeTab == "active",
                onClick = { viewModel.onTabChange("active") },
                text = {
                    val count = (uiState as? ProductsUiState.Success)?.activeCount ?: 0
                    Text("Activos ($count)")
                }
            )
            Tab(
                selected = activeTab == "inactive",
                onClick = { viewModel.onTabChange("inactive") },
                text = {
                    val count = (uiState as? ProductsUiState.Success)?.inactiveCount ?: 0
                    Text("Inactivos ($count)")
                }
            )
        }

        when (val state = uiState) {
            is ProductsUiState.Loading -> TTLoading(text = "Cargando catálogo de productos...")
            is ProductsUiState.Error -> TTErrorState(
                title = "Error de productos",
                message = state.message,
                onRetry = { viewModel.loadProducts() }
            )
            is ProductsUiState.Success -> TTDataTable(
                title = "Productos y materiales",
                subtitle = "${state.total} insumos registrados",
                items = state.products,
                searchQuery = searchQuery,
                onSearchChange = viewModel::onSearchChange,
                onCreateClick = if (PermissionChecker.hasPermission("products.create")) {
                    { /* El formulario de alta existente se conserva en la web. */ }
                } else null,
                createLabel = "Nuevo material",
                emptyText = if (activeTab == "inactive") "No hay productos inactivos." else "Sin productos activos.",
                modifier = Modifier.weight(1f)
            ) { product ->
                TTCard(modifier = Modifier.fillMaxWidth()) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(product.name, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = FaiTextPrimary)
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "SKU: ${product.sku} • Unidad: ${product.unit ?: "unidad"} • Costo: ${formatMoney(product.costPrice ?: 0.0)}",
                                    fontSize = 12.sp,
                                    color = FaiTextMuted
                                )
                                if ((product.minStock ?: 0.0) > 0) {
                                    Text(
                                        text = "Stock mín: ${product.minStock} | Stock máx: ${product.maxStock ?: "N/A"}",
                                        fontSize = 11.sp,
                                        color = FaiTextSecondary
                                    )
                                }
                            }
                            TTBadge(status = product.status)
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                            if (PermissionChecker.hasPermission("products.update")) {
                                TTButton(
                                    text = if (activeTab == "active") "Desactivar" else "Reactivar",
                                    onClick = { confirmation = ProductConfirmation(product, if (activeTab == "active") "deactivate" else "reactivate") },
                                    variant = if (activeTab == "active") TTButtonVariant.Secondary else TTButtonVariant.Primary,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                            if (PermissionChecker.hasPermission("products.delete") && !product.hasHistory) {
                                TTButton(
                                    text = if (activeTab == "active") "Eliminar" else "Eliminar definitivamente",
                                    onClick = { confirmation = ProductConfirmation(product, "delete") },
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

    confirmation?.let { pending ->
        val destructive = pending.action == "delete"
        val verb = when (pending.action) {
            "deactivate" -> "Desactivar"
            "reactivate" -> "Reactivar"
            else -> "Eliminar definitivamente"
        }
        AlertDialog(
            onDismissRequest = { confirmation = null },
            title = { Text("$verb producto") },
            text = {
                Text(
                    if (pending.action == "deactivate") {
                        "¿Desactivar ${pending.product.name}? Ya no se podrá vender ni comprar. Su historial se conserva y podrás reactivarlo."
                    } else if (pending.action == "reactivate") {
                        "¿Reactivar ${pending.product.name}?"
                    } else {
                        "¿Eliminar ${pending.product.name} definitivamente? Esta acción no se puede deshacer."
                    }
                )
            },
            confirmButton = {
                TTButton(
                    text = verb,
                    variant = if (destructive) TTButtonVariant.Danger else if (pending.action == "reactivate") TTButtonVariant.Primary else TTButtonVariant.Secondary,
                    onClick = {
                        confirmation = null
                        val onError: (String) -> Unit = { message -> notice = message }
                        when (pending.action) {
                            "deactivate" -> viewModel.deactivateProduct(pending.product.id, onError)
                            "reactivate" -> viewModel.reactivateProduct(pending.product.id, onError)
                            else -> viewModel.deleteProduct(pending.product.id, onError)
                        }
                    }
                )
            },
            dismissButton = {
                TextButton(onClick = { confirmation = null }) { Text("Cancelar") }
            }
        )
    }

    notice?.let { message ->
        AlertDialog(
            onDismissRequest = { notice = null },
            title = { Text("Aviso") },
            text = { Text(message) },
            confirmButton = { TextButton(onClick = { notice = null }) { Text("Entendido") } }
        )
    }
}
