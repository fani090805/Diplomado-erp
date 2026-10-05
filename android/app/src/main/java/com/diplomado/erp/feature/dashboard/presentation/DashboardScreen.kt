package com.diplomado.erp.feature.dashboard.presentation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Apartment
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.diplomado.erp.core.security.TokenStorage
import com.diplomado.erp.ui.components.*
import com.diplomado.erp.ui.theme.*

@Composable
fun DashboardScreen(
    onNavigate: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: DashboardViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    val userName = TokenStorage.getUserName().ifEmpty { "Residente de Obra" }
    val userEmail = TokenStorage.getUserEmail()
    val roleLabel = TokenStorage.getRoleLabel()
    val companyName = TokenStorage.getCompanyName().ifEmpty { "Mi empresa" }

    Box(modifier = modifier.fillMaxSize().padding(16.dp)) {
        when (val state = uiState) {
            is DashboardUiState.Loading -> {
                TTLoading(text = "Cargando métricas de FAI Solution ERP...")
            }
            is DashboardUiState.Error -> {
                TTEmptyState(
                    title = "Error de conexión",
                    description = state.message,
                    actionLabel = "Reintentar",
                    onAction = { viewModel.loadData() }
                )
            }
            is DashboardUiState.Success -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // HERO BANNER
                    item {
                        TTCard {
                            Column {
                                TTBadge(status = "active", customLabel = "FAI Solution ERP")
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Buenos días, $userName",
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = FaiTextPrimary
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "$companyName · Panel de control",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = FaiPrimary
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    TTIconText(icon = Icons.Outlined.Person, text = userEmail)
                                    Spacer(modifier = Modifier.width(12.dp))
                                    TTIconText(icon = Icons.Outlined.Shield, text = roleLabel)
                                }
                            }
                        }
                    }

                    // METRICAS / KPIS
                    item {
                        Text(
                            text = "Métricas del negocio",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = FaiTextPrimary
                        )
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            TTStatCard(
                                label = "Estimaciones / Ventas",
                                value = "$${String.format("%.2f", state.kpis?.sales?.total ?: 0.0)}",
                                trend = "${state.kpis?.sales?.count ?: 0} contratadas",
                                accentColor = FaiPrimary,
                                modifier = Modifier.weight(1f)
                            )
                            TTStatCard(
                                label = "Compras Materiales",
                                value = "$${String.format("%.2f", state.kpis?.purchases?.total ?: 0.0)}",
                                trend = "${state.kpis?.purchases?.count ?: 0} órdenes",
                                accentColor = FaiInfo,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            val net = state.kpis?.net ?: 0.0
                            TTStatCard(
                                label = "Resultado Operativo",
                                value = "$${String.format("%.2f", net)}",
                                trend = if (net >= 0) "Superávit" else "Déficit",
                                accentColor = if (net >= 0) FaiPrimary else FaiError,
                                modifier = Modifier.weight(1f)
                            )
                            TTStatCard(
                                label = "Materiales Stock Bajo",
                                value = "${state.kpis?.catalog?.lowStock ?: 0}",
                                trend = "Insumos por reponer",
                                accentColor = if ((state.kpis?.catalog?.lowStock ?: 0) > 0) FaiError else FaiPrimary,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // SALUD DEL SISTEMA
                    item {
                        TTCard(title = "Estado operativo") {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    TTIconText(icon = Icons.Outlined.Apartment, text = "Obras y centros de costo", fontSize = 13.sp, color = FaiTextPrimary, iconTint = FaiPrimaryLight)
                                    TTBadge(status = "IN_PROGRESS")
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    TTIconText(icon = Icons.Outlined.Inventory2, text = "Inventario y almacenes", fontSize = 13.sp, color = FaiTextPrimary, iconTint = FaiPrimaryLight)
                                    TTBadge(status = "active", customLabel = "Óptimo")
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    TTIconText(icon = Icons.Outlined.Security, text = "Multiempresa y seguridad RBAC", fontSize = 13.sp, color = FaiTextPrimary, iconTint = FaiPrimaryLight)
                                    TTBadge(status = "POSTED", customLabel = "Protegido")
                                }
                            }
                        }
                    }

                    // ACTIVIDAD RECIENTE
                    if (state.auditLogs.isNotEmpty()) {
                        item {
                            Text(
                                text = "Trazabilidad de Actividad",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = FaiTextPrimary
                            )
                        }

                        items(state.auditLogs) { log ->
                            TTCard {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "${log.action} (${log.entity})",
                                            fontSize = 14.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = FaiTextPrimary
                                        )
                                        Text(
                                            text = "${log.user?.email ?: "Sistema"} • ${log.createdAt?.take(10) ?: ""}",
                                            fontSize = 12.sp,
                                            color = FaiTextMuted
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
    }
}
