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
import com.diplomado.erp.core.common.ActivityDescriber
import com.diplomado.erp.core.common.ActivityItem
import com.diplomado.erp.core.security.TokenStorage
import com.diplomado.erp.ui.components.*
import com.diplomado.erp.ui.theme.*

@Composable
fun AuditScreen(
    modifier: Modifier = Modifier,
    viewModel: AuditViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val currentEmail = TokenStorage.getUserEmail()
    val currentName = TokenStorage.getUserName()

    TTRefreshable(
        loading = uiState is AuditUiState.Loading,
        onRefresh = { viewModel.loadAuditLogs() },
        modifier = modifier.fillMaxSize().padding(16.dp)
    ) {
        when (val state = uiState) {
            is AuditUiState.Loading -> TTLoading(text = "Cargando bitácora de actividad...")
            is AuditUiState.Error -> {
                TTErrorState(
                    title = "Error de trazabilidad",
                    message = state.message,
                    onRetry = { viewModel.loadAuditLogs() }
                )
            }
            is AuditUiState.Success -> {
                TTDataTable(
                    title = "Auditoría",
                    subtitle = "${state.logs.size} eventos recientes",
                    items = state.logs,
                    emptyText = "Sin registros de auditoría registrados."
                ) { log ->
                    TTCard(modifier = Modifier.fillMaxWidth()) {
                        TTActivityRow(
                            ActivityItem(
                                id = log.id,
                                actorName = ActivityDescriber.actorName(log, emptyMap(), currentEmail, currentName),
                                sentence = ActivityDescriber.sentenceFor(log),
                                module = log.module.orEmpty(),
                                createdAt = log.createdAt,
                                isSession = ActivityDescriber.isSession(log)
                            )
                        )
                    }
                }
            }
        }
    }
}
