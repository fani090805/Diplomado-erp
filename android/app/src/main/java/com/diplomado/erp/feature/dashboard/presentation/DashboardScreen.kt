package com.diplomado.erp.feature.dashboard.presentation

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
    val companyName = TokenStorage.getCompanyName().ifEmpty { "Empresa Constructora" }

    Box(modifier = modifier.fillMaxSize().padding(16.dp)) {
        when (val state = uiState) {
            is DashboardUiState.Loading -> {
                TTLoading(text = "Cargando métricas de ERP Constructor...")
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
                                TTBadge(status = "active", customLabel = "TEC[ODE] ERP CONSTRUCTOR")
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "Buenos días, $userName",
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = TecodeTextPrimary
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "$companyName · Control de Obras y Materiales",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = TecodeAccent
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                Text(
                                    text = "👤 $userEmail  •  🛡️ $roleLabel",
                                    fontSize = 12.sp,
                                    color = TecodeTextMuted
                                )
                            }
                        }
                    }

                    // METRICAS / KPIS
                    item {
                        Text(
                            text = "Métricas de Construcción",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Bold,
                            color = TecodeTextPrimary
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
                                accentColor = TecodeAccent,
                                modifier = Modifier.weight(1f)
                            )
                            TTStatCard(
                                label = "Compras Materiales",
                                value = "$${String.format("%.2f", state.kpis?.purchases?.total ?: 0.0)}",
                                trend = "${state.kpis?.purchases?.count ?: 0} órdenes",
                                accentColor = TecodeInfo,
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
                                accentColor = if (net >= 0) TecodeAccent else TecodeError,
                                modifier = Modifier.weight(1f)
                            )
                            TTStatCard(
                                label = "Materiales Stock Bajo",
                                value = "${state.kpis?.catalog?.lowStock ?: 0}",
                                trend = "Insumos por reponer",
                                accentColor = if ((state.kpis?.catalog?.lowStock ?: 0) > 0) TecodeError else TecodeAccent,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // SALUD DEL SISTEMA
                    item {
                        TTCard(title = "Estado Operativo de Obras Tec[ode]") {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(text = "🏗️ Obras & Centros de Costo", fontSize = 13.sp, color = TecodeTextPrimary)
                                    TTBadge(status = "active", customLabel = "En Proceso")
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(text = "🧱 Inventario Materiales & Bodegas", fontSize = 13.sp, color = TecodeTextPrimary)
                                    TTBadge(status = "active", customLabel = "Óptimo")
                                }
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(text = "🛡️ Multi-tenant & Seguridad RBAC", fontSize = 13.sp, color = TecodeTextPrimary)
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
                                color = TecodeTextPrimary
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
                                            color = TecodeTextPrimary
                                        )
                                        Text(
                                            text = "${log.user?.email ?: "Sistema"} • ${log.createdAt?.take(10) ?: ""}",
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
    }
}
