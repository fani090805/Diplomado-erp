package com.diplomado.erp.feature.crm.presentation

import com.diplomado.erp.core.common.formatMoney

import com.diplomado.erp.core.common.friendlyError

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
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.LeadDto
import com.diplomado.erp.ui.components.*
import com.diplomado.erp.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class LeadsUiState {
    data object Loading : LeadsUiState()
    data class Success(val leads: List<LeadDto>) : LeadsUiState()
    data class Error(val message: String) : LeadsUiState()
}

class LeadsViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<LeadsUiState>(LeadsUiState.Loading)
    val uiState: StateFlow<LeadsUiState> = _uiState.asStateFlow()

    init {
        loadLeads()
    }

    fun loadLeads() {
        viewModelScope.launch {
            _uiState.value = LeadsUiState.Loading
            try {
                val res = RetrofitClient.api.getLeads()
                if (res.isSuccessful && res.body()?.data != null) {
                    _uiState.value = LeadsUiState.Success(res.body()!!.data!!)
                } else {
                    _uiState.value = LeadsUiState.Error("No se pudieron cargar los prospectos de obra.")
                }
            } catch (e: Exception) {
                _uiState.value = LeadsUiState.Error(friendlyError(e, "Error de red al consultar prospectos."))
            }
        }
    }
}

@Composable
fun LeadsScreen(
    modifier: Modifier = Modifier,
    viewModel: LeadsViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    TTRefreshable(
        loading = uiState is LeadsUiState.Loading,
        onRefresh = { viewModel.loadLeads() },
        modifier = modifier.fillMaxSize().padding(16.dp)
    ) {
        when (val state = uiState) {
            is LeadsUiState.Loading -> TTLoading(text = "Cargando prospectos y proyectos comerciales...")
            is LeadsUiState.Error -> {
                TTErrorState(
                    title = "Error de prospectos",
                    message = state.message,
                    onRetry = { viewModel.loadLeads() }
                )
            }
            is LeadsUiState.Success -> {
                TTDataTable(
                    title = "CRM Prospectos de Obra",
                    subtitle = "${state.leads.size} proyectos en negociación",
                    items = state.leads,
                    emptyText = "Sin prospectos de obra registrados."
                ) { lead ->
                    TTCard(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = lead.name,
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FaiTextPrimary
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Empresa: ${lead.company ?: "Particular"} • Email: ${lead.email ?: "—"}",
                                    fontSize = 12.sp,
                                    color = FaiTextMuted
                                )
                                if ((lead.expectedAmount ?: 0.0) > 0) {
                                    Text(
                                        text = "Monto estimado: ${formatMoney(lead.expectedAmount)}",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = FaiPrimary
                                    )
                                }
                            }
                            TTBadge(status = lead.status, customLabel = lead.status)
                        }
                    }
                }
            }
        }
    }
}
