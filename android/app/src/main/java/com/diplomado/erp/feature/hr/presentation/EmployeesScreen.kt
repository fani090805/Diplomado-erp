package com.diplomado.erp.feature.hr.presentation

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
import com.diplomado.erp.core.network.dto.EmployeeDto
import com.diplomado.erp.ui.components.*
import com.diplomado.erp.ui.theme.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class EmployeesUiState {
    data object Loading : EmployeesUiState()
    data class Success(val employees: List<EmployeeDto>) : EmployeesUiState()
    data class Error(val message: String) : EmployeesUiState()
}

class EmployeesViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<EmployeesUiState>(EmployeesUiState.Loading)
    val uiState: StateFlow<EmployeesUiState> = _uiState.asStateFlow()

    init {
        loadEmployees()
    }

    fun loadEmployees() {
        viewModelScope.launch {
            _uiState.value = EmployeesUiState.Loading
            try {
                val res = RetrofitClient.api.getEmployees()
                if (res.isSuccessful && res.body()?.data != null) {
                    _uiState.value = EmployeesUiState.Success(res.body()!!.data!!)
                } else {
                    _uiState.value = EmployeesUiState.Error("No se pudo cargar el personal de obra.")
                }
            } catch (e: Exception) {
                _uiState.value = EmployeesUiState.Error(e.message ?: "Error de red al consultar personal.")
            }
        }
    }
}

@Composable
fun EmployeesScreen(
    modifier: Modifier = Modifier,
    viewModel: EmployeesViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Box(modifier = modifier.fillMaxSize().padding(16.dp)) {
        when (val state = uiState) {
            is EmployeesUiState.Loading -> TTLoading(text = "Cargando personal y cuadrillas de obra...")
            is EmployeesUiState.Error -> {
                TTEmptyState(
                    title = "Error de personal",
                    description = state.message,
                    actionLabel = "Reintentar",
                    onAction = { viewModel.loadEmployees() }
                )
            }
            is EmployeesUiState.Success -> {
                TTDataTable(
                    title = "RRHH & Cuadrillas de Obra",
                    subtitle = "${state.employees.size} trabajadores registrados",
                    items = state.employees,
                    emptyText = "Sin personal de obra registrado."
                ) { emp ->
                    TTCard(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${emp.firstName} ${emp.lastName}",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = FaiTextPrimary
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Doc: ${emp.documentId} • Puesto: ${emp.position ?: "Operativo"} • Cuadrilla: ${emp.department ?: "General"}",
                                    fontSize = 12.sp,
                                    color = FaiTextMuted
                                )
                            }
                            TTBadge(status = emp.status)
                        }
                    }
                }
            }
        }
    }
}
