package com.diplomado.erp.feature.configuration.presentation

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
fun AuditScreen(
    modifier: Modifier = Modifier,
    viewModel: AuditViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Box(modifier = modifier.fillMaxSize().padding(16.dp)) {
        when (val state = uiState) {
            is AuditUiState.Loading -> TTLoading(text = "Cargando bitácora inmutable de auditoría...")
            is AuditUiState.Error -> {
                TTEmptyState(
                    title = "Error de auditoría",
                    description = state.message,
                    actionLabel = "Reintentar",
                    onAction = { viewModel.loadAuditLogs() }
                )
            }
            is AuditUiState.Success -> {
                TTDataTable(
                    title = "Auditoría",
                    subtitle = "${state.logs.size} eventos registrados (Solo lectura)",
                    items = state.logs,
                    emptyText = "Sin registros de auditoría."
                ) { log ->
                    TTCard(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${log.action} • ${log.entity}",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TecodeTextPrimary
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Usuario: ${log.user?.email ?: "Sistema"} • Fecha: ${log.createdAt?.take(10) ?: "—"}",
                                    fontSize = 12.sp,
                                    color = TecodeTextMuted
                                )
                            }
                            TTBadge(status = "active", customLabel = "Auditado")
                        }
                    }
                }
            }
        }
    }
}
