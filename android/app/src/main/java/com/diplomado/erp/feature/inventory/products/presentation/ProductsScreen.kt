package com.diplomado.erp.feature.inventory.products.presentation

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
fun ProductsScreen(
    modifier: Modifier = Modifier,
    viewModel: ProductsViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val searchQuery by viewModel.searchQuery.collectAsState()

    Box(modifier = modifier.fillMaxSize().padding(16.dp)) {
        when (val state = uiState) {
            is ProductsUiState.Loading -> TTLoading(text = "Cargando productos...")
            is ProductsUiState.Error -> {
                TTEmptyState(
                    title = "Error de productos",
                    description = state.message,
                    actionLabel = "Reintentar",
                    onAction = { viewModel.loadProducts() }
                )
            }
            is ProductsUiState.Success -> {
                TTDataTable(
                    title = "Productos",
                    subtitle = "${state.total} registros",
                    items = state.products,
                    searchQuery = searchQuery,
                    onSearchChange = { viewModel.onSearchChange(it) },
                    onCreateClick = if (PermissionChecker.hasPermission("products.create")) {
                        { /* Abrir diálogo crear */ }
                    } else null,
                    createLabel = "Nuevo producto",
                    emptyText = "Sin productos registrados."
                ) { product ->
                    TTCard(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = product.name,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TecodeTextPrimary
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "SKU: ${product.sku} • Costo: $${String.format("%.2f", product.costPrice ?: 0.0)} • Precio: $${String.format("%.2f", product.salePrice ?: 0.0)}",
                                    fontSize = 12.sp,
                                    color = TecodeTextMuted
                                )
                            }
                            TTBadge(status = product.status)
                        }
                    }
                }
            }
        }
    }
}
