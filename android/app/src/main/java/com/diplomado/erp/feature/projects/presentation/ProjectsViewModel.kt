package com.diplomado.erp.feature.projects.presentation

import com.diplomado.erp.core.common.friendlyError

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.ProjectDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class ProjectsUiState {
    data object Loading : ProjectsUiState()
    data class Success(val projects: List<ProjectDto>) : ProjectsUiState()
    data class Error(val message: String) : ProjectsUiState()
}

class ProjectsViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<ProjectsUiState>(ProjectsUiState.Loading)
    val uiState: StateFlow<ProjectsUiState> = _uiState.asStateFlow()

    init {
        loadProjects()
    }

    fun loadProjects(search: String? = null) {
        viewModelScope.launch {
            _uiState.value = ProjectsUiState.Loading
            try {
                val res = RetrofitClient.api.getProjects(search = search)
                if (res.isSuccessful) {
                    _uiState.value = ProjectsUiState.Success(res.body()?.data ?: emptyList())
                } else {
                    _uiState.value = ProjectsUiState.Error("No se pudieron cargar las obras.")
                }
            } catch (e: Exception) {
                _uiState.value = ProjectsUiState.Error(friendlyError(e, "Error de red al consultar obras."))
            }
        }
    }
}
