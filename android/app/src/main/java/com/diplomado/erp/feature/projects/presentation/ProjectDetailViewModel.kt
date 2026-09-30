package com.diplomado.erp.feature.projects.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.CostCenterDto
import com.diplomado.erp.core.network.dto.ProjectDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class ProjectDetailUiState {
    data object Loading : ProjectDetailUiState()
    data class Success(
        val project: ProjectDto,
        val costCenters: List<CostCenterDto>
    ) : ProjectDetailUiState()
    data class Error(val message: String) : ProjectDetailUiState()
}

class ProjectDetailViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<ProjectDetailUiState>(ProjectDetailUiState.Loading)
    val uiState: StateFlow<ProjectDetailUiState> = _uiState.asStateFlow()

    fun loadProjectDetail(projectId: String) {
        viewModelScope.launch {
            _uiState.value = ProjectDetailUiState.Loading
            try {
                val projectRes = RetrofitClient.api.getProjectById(projectId)
                val costCentersRes = RetrofitClient.api.getCostCenters(projectId = projectId)

                if (projectRes.isSuccessful && projectRes.body()?.data != null) {
                    val project = projectRes.body()!!.data!!
                    val costCenters = if (costCentersRes.isSuccessful) costCentersRes.body()?.data ?: emptyList() else emptyList()
                    _uiState.value = ProjectDetailUiState.Success(project, costCenters)
                } else {
                    _uiState.value = ProjectDetailUiState.Error("No se pudo obtener el detalle de la obra.")
                }
            } catch (e: Exception) {
                _uiState.value = ProjectDetailUiState.Error(e.message ?: "Error de red al consultar la obra.")
            }
        }
    }
}
