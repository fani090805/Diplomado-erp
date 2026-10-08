package com.diplomado.erp.feature.auth.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.diplomado.erp.ui.components.TTButton
import com.diplomado.erp.ui.components.TTButtonVariant
import com.diplomado.erp.ui.components.TTTextField
import com.diplomado.erp.ui.theme.FaiFontFamily
import com.diplomado.erp.ui.theme.FaiTextMuted

/** Inicio de sesión, con los mismos textos y avisos que LoginScreen.js de la web. */
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onGoBack: () -> Unit,
    onGoRegister: () -> Unit,
    onGoForgot: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: LoginViewModel = viewModel()
) {
    var email by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.success) {
        if (state.success) onLoginSuccess()
    }

    val submit = { viewModel.login(email, password) }

    AuthScaffold(onGoBack = onGoBack, modifier = modifier) {
        AuthTitle("Iniciar Sesión", "Ingrese sus credenciales para acceder al ecosistema.")

        state.notice?.let { AuthNoticeBox(message = it.message, pending = it.pending) }

        TTTextField(
            value = email,
            onValueChange = { email = it },
            label = "Correo Electrónico",
            placeholder = "usuario@empresa.com",
            enabled = !state.loading,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next)
        )
        Spacer(modifier = Modifier.height(14.dp))
        TTTextField(
            value = password,
            onValueChange = { password = it },
            label = "Contraseña",
            placeholder = "••••••••",
            isPassword = true,
            enabled = !state.loading,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { submit() })
        )

        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
            AuthTextLink("¿Olvidaste tu contraseña?", onClick = onGoForgot)
        }
        Spacer(modifier = Modifier.height(8.dp))

        TTButton(
            text = "Acceder al Sistema",
            onClick = submit,
            modifier = Modifier.fillMaxWidth(),
            variant = TTButtonVariant.Primary,
            loading = state.loading,
            enabled = email.isNotEmpty() && password.isNotEmpty()
        )
        ConnectionMessage(state.connectionMessage)

        AuthLinkRow(prompt = "¿No tienes cuenta? ", action = "Crear cuenta", onClick = onGoRegister)

        Text(
            text = "FAI Solution ERP · Sistema Seguro SSL / TLS",
            fontSize = 11.sp,
            fontFamily = FaiFontFamily,
            color = FaiTextMuted,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )
    }
}
