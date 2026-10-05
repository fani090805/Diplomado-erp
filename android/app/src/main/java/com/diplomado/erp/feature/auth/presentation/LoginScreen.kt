package com.diplomado.erp.feature.auth.presentation

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
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

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(FaiBackground)
            .verticalScroll(rememberScrollState())
    ) {
        // Bloque de marca (igual que la web en celular)
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(FaiPrimary)
                .padding(horizontal = 24.dp, vertical = 40.dp),
            contentAlignment = Alignment.Center
        ) {
            FaiLogo(size = FaiLogoSize.Lg, variant = FaiLogoVariant.Dark, vertical = true)
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            contentAlignment = Alignment.TopCenter
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 480.dp),
                shape = FaiShapes.CardLarge,
                colors = CardDefaults.cardColors(containerColor = FaiSurface),
                border = BorderStroke(1.dp, FaiBorder),
                elevation = CardDefaults.cardElevation(defaultElevation = 0.dp)
            ) {
                Column(modifier = Modifier.padding(24.dp)) {
                    Text(
                        text = "Iniciar Sesión",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        fontFamily = FaiFontFamily,
                        color = FaiTextPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Ingrese sus credenciales para acceder al ecosistema.",
                        fontSize = 13.sp,
                        fontFamily = FaiFontFamily,
                        color = FaiTextMuted
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    if (uiState is LoginUiState.Error) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 14.dp)
                                .background(FaiStatusNegativeBg, FaiShapes.Control)
                                .border(1.dp, FaiStatusNegativeBorder, FaiShapes.Control)
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.ErrorOutline,
                                contentDescription = null,
                                tint = FaiError,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = (uiState as LoginUiState.Error).message,
                                color = FaiStatusNegativeText,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                fontFamily = FaiFontFamily
                            )
                        }
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

                    Spacer(modifier = Modifier.height(22.dp))

                    TTButton(
                        text = "Acceder al Sistema",
                        onClick = { viewModel.login(email, password) },
                        modifier = Modifier.fillMaxWidth(),
                        variant = TTButtonVariant.Primary,
                        loading = uiState is LoginUiState.Loading,
                        enabled = email.isNotEmpty() && password.isNotEmpty()
                    )
                }
            }
        }

        Text(
            text = "FAI Solution ERP · Sistema Seguro SSL / TLS",
            fontSize = 11.sp,
            fontFamily = FaiFontFamily,
            color = FaiTextMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 24.dp)
        )
    }
}
