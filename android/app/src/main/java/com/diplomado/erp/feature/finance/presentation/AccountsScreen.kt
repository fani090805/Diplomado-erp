package com.diplomado.erp.feature.finance.presentation

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

    Box(modifier = modifier.fillMaxSize().padding(16.dp)) {
        when (val state = uiState) {
            is AccountsUiState.Loading -> TTLoading(text = "Cargando cuentas financieras...")
            is AccountsUiState.Error -> {
                TTEmptyState(
                    title = "Error de cuentas",
                    description = state.message,
                    actionLabel = "Reintentar",
                    onAction = { viewModel.loadAccounts() }
                )
            }
            is AccountsUiState.Success -> {
                TTDataTable(
                    title = "Cuentas Financieras",
                    subtitle = "${state.accounts.size} cuentas de tesorería",
                    items = state.accounts,
                    emptyText = "Sin cuentas financieras."
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
                                    color = TecodeTextPrimary
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Código: ${account.code} • Tipo: ${account.type.uppercase()} • ${account.currency}",
                                    fontSize = 12.sp,
                                    color = TecodeTextMuted
                                )
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text(
                                    text = "$${String.format("%.2f", account.balance)}",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = TecodeAccent
                                )
                                TTBadge(status = account.status)
                            }
                        }
                    }
                }
            }
        }
    }
}
