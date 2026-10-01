package com.diplomado.erp.feature.users.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.diplomado.erp.core.common.rbac.PermissionChecker
import com.diplomado.erp.ui.components.*
import com.diplomado.erp.ui.theme.*

@Composable
fun UsersScreen(
    modifier: Modifier = Modifier,
    viewModel: UsersViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var showDialog by remember { mutableStateOf(false) }

    var name by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var selectedRoleId by remember { mutableStateOf("") }
    var formError by remember { mutableStateOf<String?>(null) }
    var isSubmitting by remember { mutableStateOf(false) }

    Box(modifier = modifier.fillMaxSize().padding(16.dp)) {
        when (val state = uiState) {
            is UsersUiState.Loading -> TTLoading(text = "Cargando usuarios...")
            is UsersUiState.Error -> {
                TTEmptyState(
                    title = "Error de usuarios",
                    description = state.message,
                    actionLabel = "Reintentar",
                    onAction = { viewModel.loadUsers() }
                )
            }
            is UsersUiState.Success -> {
                val adminRole = state.roles.firstOrNull { it.code == "administrador" || it.code == "gerente" }
                if (selectedRoleId.isEmpty() && adminRole != null) {
                    selectedRoleId = adminRole.id
                }

                TTDataTable(
                    title = "Usuarios",
                    subtitle = "${state.users.size} registrados",
                    items = state.users,
                    onCreateClick = if (PermissionChecker.hasPermission("users.create")) {
                        {
                            name = ""
                            lastName = ""
                            email = ""
                            formError = null
                            showDialog = true
                        }
                    } else null,
                    createLabel = "Nuevo usuario",
                    emptyText = "Sin usuarios registrados."
                ) { user ->
                    TTCard(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${user.name} ${user.lastName ?: ""}".trim(),
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TecodeTextPrimary
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "📧 ${user.email}",
                                    fontSize = 12.sp,
                                    color = TecodeTextMuted
                                )
                            }
                            TTBadge(status = user.status)
                        }
                    }
                }

                // DIALOGO CREAR NUEVO USUARIO
                if (showDialog) {
                    androidx.compose.ui.window.Dialog(onDismissRequest = { if (!isSubmitting) showDialog = false }) {
                        TTCard(modifier = Modifier.fillMaxWidth()) {
                            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                Text(
                                    text = "Nuevo Usuario",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TecodeTextPrimary
                                )

                                Text(
                                    text = "Al guardar, se enviará automáticamente un correo de bienvenida con las credenciales vía Resend.",
                                    fontSize = 12.sp,
                                    color = TecodeTextMuted
                                )

                                if (formError != null) {
                                    Text(
                                        text = "⚠️ $formError",
                                        fontSize = 12.sp,
                                        color = TecodeError,
                                        fontWeight = FontWeight.Bold
                                    )
                                }

                                TTTextField(
                                    value = name,
                                    onValueChange = { name = it },
                                    label = "Nombre",
                                    placeholder = "Juan"
                                )

                                TTTextField(
                                    value = lastName,
                                    onValueChange = { lastName = it },
                                    label = "Apellidos",
                                    placeholder = "Pérez"
                                )

                                TTTextField(
                                    value = email,
                                    onValueChange = { email = it },
                                    label = "Correo Electrónico",
                                    placeholder = "usuario@correo.com"
                                )

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    TTButton(
                                        text = "Cancelar",
                                        onClick = { showDialog = false },
                                        variant = TTButtonVariant.Ghost,
                                        modifier = Modifier.weight(1f),
                                        enabled = !isSubmitting
                                    )
                                    TTButton(
                                        text = "Guardar",
                                        onClick = {
                                            if (name.isBlank() || email.isBlank()) {
                                                formError = "Ingrese nombre y correo."
                                                return@TTButton
                                            }
                                            isSubmitting = true
                                            viewModel.createUser(name, lastName, email, selectedRoleId) { success, err ->
                                                isSubmitting = false
                                                if (success) {
                                                    showDialog = false
                                                } else {
                                                    formError = err ?: "Error al registrar usuario."
                                                }
                                            }
                                        },
                                        variant = TTButtonVariant.Primary,
                                        loading = isSubmitting,
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
