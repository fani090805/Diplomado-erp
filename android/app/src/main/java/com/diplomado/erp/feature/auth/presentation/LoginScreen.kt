package com.diplomado.erp.feature.auth.presentation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.diplomado.erp.ui.components.*
import com.diplomado.erp.ui.theme.*

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: LoginViewModel = viewModel()
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState) {
        if (uiState is LoginUiState.Success) {
            onLoginSuccess()
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(TecodeBackground)
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 440.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            TTCard {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.Start
                ) {
                    TecodeLogo(isLarge = true, showTagline = true)

                    Spacer(modifier = Modifier.height(24.dp))

                    Text(
                        text = "Iniciar Sesión",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = TecodeTextPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Ingrese sus credenciales para acceder al ecosistema.",
                        fontSize = 13.sp,
                        color = TecodeTextMuted
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    if (uiState is LoginUiState.Error) {
                        Text(
                            text = "⚠️ ${(uiState as LoginUiState.Error).message}",
                            color = TecodeError,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(bottom = 12.dp)
                        )
                    }

                    TTTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = "Correo Electrónico",
                        placeholder = "usuario@empresa.com",
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next
                        )
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    TTTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = "Contraseña",
                        placeholder = "••••••••",
                        isPassword = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        )
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    TTButton(
                        text = "Acceder al Sistema",
                        onClick = { viewModel.login(email, password) },
                        modifier = Modifier.fillMaxWidth(),
                        variant = TTButtonVariant.Primary,
                        loading = uiState is LoginUiState.Loading,
                        enabled = email.isNotEmpty() && password.isNotEmpty()
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "Tec[ode ERP Multiempresa · Sistema Seguro SSL",
                        fontSize = 11.sp,
                        color = TecodeTextMuted,
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    )
                }
            }
        }
    }
}
