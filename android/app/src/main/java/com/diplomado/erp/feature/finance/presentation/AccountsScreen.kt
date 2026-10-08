package com.diplomado.erp.feature.finance.presentation

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
import com.diplomado.erp.ui.components.*
import com.diplomado.erp.ui.theme.*

@Composable
fun AccountsScreen(
    modifier: Modifier = Modifier,
    viewModel: AccountsViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    TTRefreshable(
        loading = uiState is AccountsUiState.Loading,
        onRefresh = { viewModel.loadAccounts() },
        modifier = modifier.fillMaxSize().padding(16.dp)
    ) {
        when (val state = uiState) {
            is AccountsUiState.Loading -> TTLoading(text = "Cargando cuentas...")
            is AccountsUiState.Error -> {
                TTErrorState(
                    title = "Error al cargar cuentas",
                    message = state.message,
                    onRetry = { viewModel.loadAccounts() }
                )
            }
            is AccountsUiState.Success -> {
                TTDataTable(
                    title = "Cuentas",
                    subtitle = "${state.accounts.size} cuentas",
                    items = state.accounts,
                    emptyText = "Sin cuentas ni cajas chicas registradas."
                ) { account ->
                    TTCard(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = account.name,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FaiTextPrimary
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Código: ${account.code} • Tipo: ${account.type.uppercase()} • ${account.currency}",
                                    fontSize = 12.sp,
                                    color = FaiTextMuted
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "${formatMoney(account.balance)}",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = FaiPrimary
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                TTBadge(status = account.status)
                            }
                        }
                    }
                }
            }
        }
    }
}
