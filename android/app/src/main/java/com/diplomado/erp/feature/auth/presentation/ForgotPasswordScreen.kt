package com.diplomado.erp.feature.auth.presentation

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.diplomado.erp.ui.components.TTButton
import com.diplomado.erp.ui.components.TTButtonVariant
import com.diplomado.erp.ui.components.TTTextField

/**
 * Recuperar contraseña, igual que ForgotPasswordScreen.js. El enlace del correo abre la
 * página web para crear la nueva contraseña (ResetPasswordScreen de la web).
 */
@Composable
fun ForgotPasswordScreen(
    onGoLogin: () -> Unit,
    onGoBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ForgotPasswordViewModel = viewModel()
) {
    var email by rememberSaveable { mutableStateOf("") }
    val state by viewModel.uiState.collectAsState()

    AuthScaffold(onGoBack = onGoBack, modifier = modifier) {
        if (state.submitted) {
            AuthSuccess(
                title = "Revisa tu correo",
                message = "Si no lo ves, busca en spam.",
                buttonText = "Volver a iniciar sesión",
                onButton = onGoLogin
            )
            return@AuthScaffold
        }

        AuthTitle("Recuperar contraseña", "Escribe tu correo y te enviaremos un enlace para crear una nueva")
        state.error?.let { AuthNoticeBox(it) }

        TTTextField(
            value = email,
            onValueChange = { email = it },
            label = "Correo electrónico",
            placeholder = "usuario@empresa.com",
            enabled = !state.loading,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Send),
            keyboardActions = KeyboardActions(onSend = { viewModel.submit(email) })
        )
        Spacer(modifier = Modifier.height(20.dp))
        TTButton(
            text = "Enviar enlace",
            onClick = { viewModel.submit(email) },
            variant = TTButtonVariant.Primary,
            loading = state.loading,
            enabled = email.isNotBlank(),
            modifier = Modifier.fillMaxWidth()
        )
        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            AuthTextLink("Volver a iniciar sesión", onClick = onGoLogin, modifier = Modifier.padding(top = 8.dp))
        }
    }
}
