package com.diplomado.erp.feature.users.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.diplomado.erp.core.network.client.RetrofitClient
import com.diplomado.erp.core.network.dto.RoleDto
import com.diplomado.erp.core.network.dto.UserDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class UsersUiState {
    data object Loading : UsersUiState()
    data class Success(val users: List<UserDto>, val roles: List<RoleDto>) : UsersUiState()
    data class Error(val message: String) : UsersUiState()
}

class UsersViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<UsersUiState>(UsersUiState.Loading)
    val uiState: StateFlow<UsersUiState> = _uiState.asStateFlow()

    init {
        loadUsers()
    }

    fun loadUsers() {
        viewModelScope.launch {
            _uiState.value = UsersUiState.Loading
            try {
                val usersRes = RetrofitClient.api.getUsers()
                val rolesRes = RetrofitClient.api.getRoles()

                if (usersRes.isSuccessful && usersRes.body()?.data != null) {
                    val users = usersRes.body()!!.data!!
                    val roles = if (rolesRes.isSuccessful) rolesRes.body()?.data ?: emptyList() else emptyList()
                    _uiState.value = UsersUiState.Success(users, roles)
                } else {
                    _uiState.value = UsersUiState.Error("No se pudieron cargar los usuarios.")
                }
            } catch (e: Exception) {
                _uiState.value = UsersUiState.Error(e.message ?: "Error de red al consultar usuarios.")
            }
        }
    }

    fun createUser(name: String, lastName: String, email: String, password: String, roleId: String, onComplete: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            try {
                val body = mapOf(
                    "name" to name,
                    "lastName" to lastName,
                    "email" to email,
                    "password" to password.ifEmpty { "Password123!" },
                    "roleId" to roleId
                )
                val res = RetrofitClient.api.createUser(body)
                if (res.isSuccessful) {
                    loadUsers()
                    onComplete(true, null)
                } else {
                    onComplete(false, res.body()?.error?.message ?: "Error al crear usuario.")
                }
            } catch (e: Exception) {
                onComplete(false, e.message ?: "Error de conexión.")
            }
        }
    }

    fun deleteUser(userId: String, onComplete: (Boolean, String?) -> Unit) {
        viewModelScope.launch {
            try {
                val res = RetrofitClient.api.deleteUser(userId)
                if (res.isSuccessful) {
                    loadUsers()
                    onComplete(true, null)
                } else {
                    onComplete(false, res.body()?.error?.message ?: "Error al eliminar usuario.")
                }
            } catch (e: Exception) {
                onComplete(false, e.message ?: "Error de conexión.")
            }
        }
    }
}
